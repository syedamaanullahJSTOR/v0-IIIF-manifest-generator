import { NextResponse } from "next/server"
import { createServerSupabaseClient, STORAGE_BUCKET } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    // Check storage bucket
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
      return NextResponse.json({ error: "Failed to list buckets", details: bucketsError }, { status: 500 })
    }

    const bucket = buckets.find((b) => b.name === STORAGE_BUCKET)

    if (!bucket) {
      return NextResponse.json({ error: `Bucket ${STORAGE_BUCKET} not found` }, { status: 404 })
    }

    // List files in the bucket
    const { data: files, error: filesError } = await supabase.storage.from(STORAGE_BUCKET).list()

    if (filesError) {
      return NextResponse.json({ error: "Failed to list files", details: filesError }, { status: 500 })
    }

    // Check manifests table
    const { data: manifests, error: manifestsError } = await supabase
      .from("manifests")
      .select("id, label, created_at")
      .limit(5)

    if (manifestsError) {
      return NextResponse.json({ error: "Failed to query manifests", details: manifestsError }, { status: 500 })
    }

    // Check manifest_files table
    const { data: manifestFiles, error: manifestFilesError } = await supabase
      .from("manifest_files")
      .select("manifest_id, file_id")
      .limit(5)

    if (manifestFilesError) {
      return NextResponse.json(
        { error: "Failed to query manifest_files", details: manifestFilesError },
        { status: 500 },
      )
    }

    // Check files table
    const { data: fileRecords, error: fileRecordsError } = await supabase
      .from("files")
      .select("id, filename, blob_id")
      .limit(5)

    if (fileRecordsError) {
      return NextResponse.json({ error: "Failed to query files", details: fileRecordsError }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      storage: {
        bucket: {
          name: bucket.name,
          public: bucket.public,
        },
        files: files.map((f) => ({ name: f.name, size: f.metadata?.size || "unknown" })),
      },
      database: {
        manifests: manifests.map((m) => ({ id: m.id, label: m.label })),
        manifestFiles,
        files: fileRecords.map((f) => ({ id: f.id, filename: f.filename, blobId: f.blob_id })),
      },
    })
  } catch (error) {
    console.error("Debug endpoint error:", error)
    return NextResponse.json({ error: "Internal server error", details: error }, { status: 500 })
  }
}
