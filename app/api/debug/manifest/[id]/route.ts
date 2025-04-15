import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    console.log("Debug manifest request for:", id)

    const supabase = createServerSupabaseClient()

    // Get the raw manifest data
    const { data: manifest, error: manifestError } = await supabase.from("manifests").select("*").eq("id", id).single()

    if (manifestError) {
      console.error("Error fetching manifest:", manifestError)
      return NextResponse.json(
        {
          error: "Manifest not found",
          details: manifestError,
        },
        { status: 404 },
      )
    }

    // Get the files associated with this manifest
    const { data: manifestFiles, error: filesError } = await supabase
      .from("manifest_files")
      .select("file_id")
      .eq("manifest_id", id)

    if (filesError) {
      console.error("Error fetching manifest files:", filesError)
    }

    // Get the Dublin Core metadata - handle missing table gracefully
    let metadata = null
    let metadataError = null

    try {
      const { data, error } = await supabase
        .from("dublin_core_metadata")
        .select("*")
        .eq("manifest_id", id)
        .maybeSingle()

      metadata = data
      metadataError = error

      if (error && error.code === "42P01") {
        // PostgreSQL error code for undefined_table
        console.log("Dublin Core metadata table does not exist yet:", error.message)
        // Don't expose the technical error to the user
        metadataError = { message: "Metadata not available" }
      } else if (error) {
        console.error("Error fetching metadata:", error)
        metadataError = { message: "Could not retrieve metadata" }
      }
    } catch (err) {
      console.log("Exception when fetching metadata:", err)
      metadataError = { message: "Could not retrieve metadata" }
    }

    // Return all the data for debugging
    return NextResponse.json({
      success: true,
      manifest,
      manifestFiles: manifestFiles || [],
      metadata: metadata || null,
      metadataError: metadataError ? { message: metadataError.message } : null,
      manifestContent: manifest.manifest,
    })
  } catch (error) {
    console.error("Debug endpoint error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: "An unexpected error occurred",
      },
      { status: 500 },
    )
  }
}
