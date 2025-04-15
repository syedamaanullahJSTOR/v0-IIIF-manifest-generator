import type { NextRequest } from "next/server"
import { createServerSupabaseClient, STORAGE_BUCKET } from "@/lib/supabase"

export async function GET(request: NextRequest, { params }: { params: { identifier: string } }) {
  try {
    const { identifier } = params
    const baseUrl = new URL(request.url).origin
    console.log("IIIF info.json request for:", identifier)

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

    // Create a simplified IIIF Image API info.json response
    // Since we can't get the actual image dimensions without Sharp,
    // we'll use default values
    const info = {
      "@context": "http://iiif.io/api/image/3/context.json",
      id: `${baseUrl}/api/iiif/${identifier}`,
      type: "ImageService3",
      protocol: "http://iiif.io/api/image",
      profile: "level0",
      width: 1000, // Default width
      height: 1000, // Default height
      sizes: [
        { width: 150, height: 150 },
        { width: 600, height: 600 },
        { width: 1000, height: 1000 },
      ],
    }

    console.log("Generated simplified info.json:", info)

    return new Response(JSON.stringify(info), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Cache-Control": "public, max-age=86400",
      },
    })
  } catch (error) {
    console.error("IIIF info.json error:", error)
    return new Response("Error generating info.json", {
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
