import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { label, description, manifest, fileIds, metadata, externalImages } = await request.json()

    if (!label || !manifest) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Insert the manifest - don't include has_external_images field as it might not exist in the schema
    const { data: manifestData, error: manifestError } = await supabase
      .from("manifests")
      .insert({
        label,
        description,
        manifest,
      })
      .select("id")
      .single()

    if (manifestError) {
      console.error("Error storing manifest:", manifestError)
      return NextResponse.json(
        {
          error: "Failed to store manifest",
          details: manifestError.message || "Unknown database error",
        },
        { status: 500 },
      )
    }

    // Link the manifest to the files (if any local files)
    if (fileIds && Array.isArray(fileIds) && fileIds.length > 0) {
      // Filter out any null or undefined fileIds
      const validFileIds = fileIds.filter((id) => id)

      if (validFileIds.length > 0) {
        const manifestFiles = validFileIds.map((fileId) => ({
          manifest_id: manifestData.id,
          file_id: fileId,
        }))

        const { error: linkError } = await supabase.from("manifest_files").insert(manifestFiles)

        if (linkError) {
          console.error("Error linking files to manifest:", linkError)
          // Don't fail the whole operation if linking fails
          console.log("Continuing despite file linking error")
        }
      }
    }

    // Store Dublin Core metadata if provided
    if (metadata) {
      try {
        // Try to insert the metadata - if the table doesn't exist, this will fail
        const { error: metadataError } = await supabase.from("dublin_core_metadata").insert({
          manifest_id: manifestData.id,
          title: metadata.title || null,
          creator: metadata.creator || null,
          subject: metadata.subject || null,
          description: metadata.description || null,
          publisher: metadata.publisher || null,
          contributor: metadata.contributor || null,
          date: metadata.date || null,
          type: metadata.type || null,
          format: metadata.format || null,
          identifier: metadata.identifier || null,
          source: metadata.source || null,
          language: metadata.language || null,
          relation: metadata.relation || null,
          coverage: metadata.coverage || null,
          rights: metadata.rights || null,
        })

        if (metadataError) {
          // If the error is that the table doesn't exist, that's expected
          // We'll just log it and continue
          console.log("Could not store Dublin Core metadata:", metadataError.message)
        } else {
          console.log("Dublin Core metadata stored successfully")
        }
      } catch (metadataError) {
        console.error("Exception when storing Dublin Core metadata:", metadataError)
        // Continue anyway, as the manifest is already stored
      }
    }

    return NextResponse.json({
      success: true,
      id: manifestData.id,
    })
  } catch (error) {
    console.error("Error in manifest creation:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase.from("manifests").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching manifests:", error)
      return NextResponse.json({ error: "Failed to fetch manifests" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in manifest retrieval:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
