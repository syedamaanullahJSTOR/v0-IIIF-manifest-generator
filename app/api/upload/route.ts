import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, STORAGE_BUCKET } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Generate a unique filename
    const uniqueId = crypto.randomUUID()
    const fileExt = file.name.split(".").pop()
    const filePath = `${uniqueId}.${fileExt}`

    // Upload to Supabase Storage using the server client with admin privileges
    const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (uploadError) {
      console.error("Error uploading to Supabase Storage:", uploadError)
      return NextResponse.json({ error: "Failed to upload file to storage" }, { status: 500 })
    }

    // Get the public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath)

    // Store file metadata in Supabase
    const { data, error } = await supabase
      .from("files")
      .insert({
        filename: file.name,
        blob_id: filePath,
        file_type: file.type,
        size: file.size,
      })
      .select("id")
      .single()

    if (error) {
      console.error("Error storing file metadata:", error)
      return NextResponse.json({ error: "Failed to store file metadata" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      fileId: data.id,
      filePath,
      publicUrl,
    })
  } catch (error) {
    console.error("Error in file upload:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

export const config = {
  api: {
    bodyParser: false, // Disable the default body parser
  },
}
