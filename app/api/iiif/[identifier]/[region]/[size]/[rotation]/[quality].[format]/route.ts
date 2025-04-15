import type { NextRequest } from "next/server"
import { createServerSupabaseClient, STORAGE_BUCKET } from "@/lib/supabase"

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: {
      identifier: string
      region: string
      size: string
      rotation: string
      quality: string
      format: string
    }
  },
) {
  try {
    const { identifier } = params
    console.log("IIIF image request:", identifier)

    const supabase = createServerSupabaseClient()

    // Instead of processing the image with Sharp, we'll just redirect to the original image
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
    console.error("IIIF image processing error:", error)
    return new Response("Error processing image", {
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
