import type { NextRequest } from "next/server"
import { createServerSupabaseClient, STORAGE_BUCKET } from "@/lib/supabase"

export async function GET(request: NextRequest, { params }: { params: { identifier: string } }) {
  try {
    const { identifier } = params
    console.log("Direct image request for:", identifier)

    const supabase = createServerSupabaseClient()

    // Get the public URL for the image
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(identifier)

    if (!data || !data.publicUrl) {
      console.error("Error getting public URL for image:", identifier)
      return new Response("Image not found", {
        status: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      })
    }

    // Redirect to the public URL
    return Response.redirect(data.publicUrl, 302)
  } catch (error) {
    console.error("Direct image error:", error)
    return new Response("Error serving image", {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    })
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
