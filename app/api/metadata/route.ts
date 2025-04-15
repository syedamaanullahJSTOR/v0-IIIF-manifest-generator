import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { manifest_id, metadata } = await request.json()

    if (!manifest_id || !metadata) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Check if the dublin_core_metadata table exists
    try {
      // Try to query the table - this will fail if it doesn't exist
      const { data: tableCheck, error: tableError } = await supabase.from("dublin_core_metadata").select("id").limit(1)

      // If the table doesn't exist, create it
      if (tableError && tableError.code === "42P01") {
        console.log("Dublin Core metadata table doesn't exist, creating it...")

        // Return a message that the table needs to be created first
        return NextResponse.json({
          success: false,
          error: "Dublin Core metadata table doesn't exist yet. Please run the database setup first.",
          needsSetup: true,
        })
      }

      // If there's another error, log it but continue
      if (tableError) {
        console.error("Error checking metadata table:", tableError)
      }
    } catch (checkError) {
      console.error("Exception checking metadata table:", checkError)
    }

    // Check if metadata already exists for this manifest
    try {
      const { data: existingMetadata, error: checkError } = await supabase
        .from("dublin_core_metadata")
        .select("id")
        .eq("manifest_id", manifest_id)
        .maybeSingle()

      if (checkError && checkError.code !== "42P01") {
        console.error("Error checking existing metadata:", checkError)
        return NextResponse.json({ error: "Failed to check existing metadata" }, { status: 500 })
      }

      let result

      if (existingMetadata) {
        // Update existing metadata
        const { data, error } = await supabase
          .from("dublin_core_metadata")
          .update({
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
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingMetadata.id)
          .select()

        if (error) {
          console.error("Error updating metadata:", error)
          return NextResponse.json({ error: "Failed to update metadata" }, { status: 500 })
        }

        result = data
      } else {
        // Insert new metadata
        const { data, error } = await supabase
          .from("dublin_core_metadata")
          .insert({
            manifest_id,
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
          .select()

        if (error) {
          console.error("Error inserting metadata:", error)
          return NextResponse.json({ error: "Failed to insert metadata" }, { status: 500 })
        }

        result = data
      }

      return NextResponse.json({
        success: true,
        metadata: result,
      })
    } catch (error) {
      console.error("Error in metadata operation:", error)
      return NextResponse.json(
        {
          error: "Internal server error",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error in metadata operation:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
