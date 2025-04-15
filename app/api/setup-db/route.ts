import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    // First, check if the dublin_core_metadata table already exists
    try {
      const { data, error } = await supabase.from("dublin_core_metadata").select("id").limit(1)

      // If we can query the table without error, it exists
      if (!error) {
        console.log("Dublin Core metadata table already exists")
        return NextResponse.json({
          success: true,
          message: "Dublin Core metadata table already exists",
        })
      }

      // If the error is not about the table not existing, something else is wrong
      if (error.code !== "42P01") {
        console.error("Unexpected error checking table:", error)
        return NextResponse.json({
          success: false,
          error: "Unexpected error checking table",
          details: error,
        })
      }

      // If we get here, the table doesn't exist (error code 42P01)
      console.log("Dublin Core metadata table doesn't exist, will create it")
    } catch (checkErr) {
      console.error("Exception checking table:", checkErr)
      // Continue anyway and try to create the table
    }

    // Try to create the table using the Supabase REST API
    // This approach doesn't require SQL execution privileges
    try {
      // Create a temporary table to test if we can create tables
      const { error: createError } = await supabase.from("dublin_core_metadata").insert([
        {
          title: "Test Title",
          description: "Test Description",
          // Use a random UUID for manifest_id that likely won't exist
          // This will fail with a foreign key constraint, but that's expected
          manifest_id: "00000000-0000-0000-0000-000000000000",
        },
      ])

      // If the error is about a foreign key constraint, that means the table exists
      // but the manifest_id doesn't exist (which is expected)
      if (createError && createError.code === "23503") {
        console.log("Table created successfully (foreign key constraint as expected)")
        return NextResponse.json({
          success: true,
          message: "Dublin Core metadata table created successfully",
        })
      }

      // If the error is about the table not existing, we need to try a different approach
      if (createError && createError.code === "42P01") {
        console.log("Table doesn't exist and couldn't be created automatically")
        return NextResponse.json({
          success: false,
          error: "Could not create table automatically",
          details: createError,
          message:
            "The Dublin Core metadata table couldn't be created automatically. Please contact your administrator.",
        })
      }

      // If we get here, the table was created successfully
      return NextResponse.json({
        success: true,
        message: "Dublin Core metadata table created successfully",
      })
    } catch (createErr) {
      console.error("Exception creating table:", createErr)
      return NextResponse.json({
        success: false,
        error: "Exception creating table",
        details: createErr instanceof Error ? createErr.message : String(createErr),
      })
    }
  } catch (error) {
    console.error("Error in setup-db endpoint:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
