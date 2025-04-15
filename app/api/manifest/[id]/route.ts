import type { NextRequest } from "next/server"
import { kv } from "@vercel/kv"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    // Retrieve the manifest from KV storage
    const manifest = await kv.get(`manifest:${id}`)

    if (!manifest) {
      return new Response("Manifest not found", { status: 404 })
    }

    return new Response(JSON.stringify(manifest), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (error) {
    console.error("Error retrieving manifest:", error)
    return new Response("Error retrieving manifest", { status: 500 })
  }
}
