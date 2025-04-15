import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    // Instead of checking if the table exists, let's just try to query it
    // If it doesn't exist, we'll get an error that we can handle
    const { data, error } = await supabase.from("dublin_core_metadata").select("id").limit(1)

    if (error) {
      // If the error is that the table doesn't exist, that's fine
      // We'll just log it and continue
      console.log("Dublin Core metadata table may not exist:", error.message)
      return NextResponse.json({
        success: true,
        message: "Database check completed - metadata table may not exist",
        metadataTableExists: false,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Database check completed - metadata table exists",
      metadataTableExists: true,
    })
  } catch (error) {
    console.error("Error checking database:", error)
    return NextResponse.json({
      success: false,
      error: "Error checking database",
    })
  }
}
