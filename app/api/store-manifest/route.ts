import type { NextRequest } from "next/server"
import { kv } from "@vercel/kv"

export async function POST(request: NextRequest) {
  try {
    const { id, manifest } = await request.json()

    if (!id || !manifest) {
      return new Response("Missing required fields", { status: 400 })
    }

    // Store the manifest in KV storage
    await kv.set(`manifest:${id}`, manifest)

    return new Response(JSON.stringify({ success: true, id }), {
      headers: {
        "Content-Type": "application/json",
      },
    })
  } catch (error) {
    console.error("Error storing manifest:", error)
    return new Response("Error storing manifest", { status: 500 })
  }
}
