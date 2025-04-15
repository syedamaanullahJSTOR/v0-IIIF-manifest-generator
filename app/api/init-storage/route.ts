import { NextResponse } from "next/server"
import { createServerSupabaseClient, STORAGE_BUCKET } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    // Check if the bucket exists
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some((bucket) => bucket.name === STORAGE_BUCKET)

    if (!bucketExists) {
      // Create the bucket with public access
      const { error } = await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: true, // Make the bucket public
        fileSizeLimit: 50 * 1024 * 1024, // 50MB limit
      })

      if (error) {
        console.error("Error creating bucket:", error)
        return NextResponse.json({ error: "Failed to create storage bucket" }, { status: 500 })
      }

      // Set up a policy that allows public access to the bucket
      const { error: policyError } = await supabase.storage.from(STORAGE_BUCKET).createSignedUploadUrl("test.txt")
      if (policyError) {
        console.error("Error setting up bucket policy:", policyError)
      }
    }

    return NextResponse.json({ success: true, message: "Storage initialized successfully" })
  } catch (error) {
    console.error("Error initializing storage:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
