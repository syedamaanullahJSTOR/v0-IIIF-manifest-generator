import type { NextRequest } from "next/server"
import { createServerSupabaseClient, STORAGE_BUCKET } from "@/lib/supabase"

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    // Join the path segments to get the full file path
    const filePath = params.path.join("/")
    console.log("Debug image request for:", filePath)

    const supabase = createServerSupabaseClient()

    // Get the public URL for the image
    const { data, error } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath)

    if (error) {
      console.error("Error getting public URL:", error)
      return new Response(JSON.stringify({ error: "Failed to get public URL", details: error }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      })
    }

    if (!data || !data.publicUrl) {
      console.error("No public URL returned for:", filePath)
      return new Response(JSON.stringify({ error: "No public URL returned", filePath }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      })
    }

    // Check if the file exists by making a HEAD request
    try {
      const checkResponse = await fetch(data.publicUrl, { method: "HEAD" })

      if (!checkResponse.ok) {
        return new Response(
          JSON.stringify({
            error: "File not accessible",
            status: checkResponse.status,
            statusText: checkResponse.statusText,
            publicUrl: data.publicUrl,
            filePath,
          }),
          {
            status: 404,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        )
      }
    } catch (checkError) {
      console.error("Error checking file existence:", checkError)
    }

    // Return debug info
    return new Response(
      JSON.stringify({
        success: true,
        filePath,
        publicUrl: data.publicUrl,
        directImageUrl: `${new URL(request.url).origin}/api/direct-image/${filePath}`,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    )
  } catch (error) {
    console.error("Debug image error:", error)
    return new Response(
      JSON.stringify({
        error: "Error processing debug request",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    )
  }
}
