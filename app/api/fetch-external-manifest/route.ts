import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Validate that the URL is a proper URL
    try {
      new URL(url)
    } catch (error) {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    // Fetch the manifest from the external URL
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch manifest: ${response.status} ${response.statusText}` },
        { status: response.status },
      )
    }

    // Parse the manifest
    const manifest = await response.json()

    // Validate that it's a IIIF manifest
    if (!manifest["@context"] || (!manifest.items && !manifest.sequences)) {
      return NextResponse.json({ error: "The URL does not point to a valid IIIF manifest" }, { status: 400 })
    }

    return NextResponse.json(manifest)
  } catch (error) {
    console.error("Error fetching external manifest:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch manifest" },
      { status: 500 },
    )
  }
}
