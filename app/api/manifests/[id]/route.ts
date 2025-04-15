import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const supabase = createServerSupabaseClient()

    // Get the manifest
    const { data: manifest, error: manifestError } = await supabase.from("manifests").select("*").eq("id", id).single()

    if (manifestError) {
      console.error("Error fetching manifest:", manifestError)
      return NextResponse.json({ error: "Manifest not found" }, { status: 404 })
    }

    // Get the Dublin Core metadata - handle missing table gracefully
    let metadata = null
    try {
      const { data, error } = await supabase.from("dublin_core_metadata").select("*").eq("manifest_id", id).single()

      if (error) {
        if (error.code === "42P01") {
          // PostgreSQL error code for undefined_table
          console.log("Dublin Core metadata table does not exist yet:", error.message)
          // Silently continue without metadata
        } else {
          console.error("Error fetching metadata:", error)
        }
      } else {
        metadata = data
      }
    } catch (err) {
      console.log("Exception when fetching metadata:", err)
      // Silently continue without metadata
    }

    // Get the files associated with this manifest
    const { data: manifestFiles, error: filesError } = await supabase
      .from("manifest_files")
      .select("file_id")
      .eq("manifest_id", id)

    if (filesError) {
      console.error("Error fetching manifest files:", filesError)
      return NextResponse.json({ error: "Failed to fetch manifest files" }, { status: 500 })
    }

    const fileIds = manifestFiles.map((mf) => mf.file_id)

    // Get the file details
    const { data: files, error: fileDetailsError } = await supabase.from("files").select("*").in("id", fileIds)

    if (fileDetailsError) {
      console.error("Error fetching file details:", fileDetailsError)
      return NextResponse.json({ error: "Failed to fetch file details" }, { status: 500 })
    }

    return NextResponse.json({
      ...manifest,
      metadata,
      files,
    })
  } catch (error) {
    console.error("Error in manifest retrieval:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
