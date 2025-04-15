import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"
import JSZip from "jszip"

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    // Fetch all manifests
    const { data: manifests, error } = await supabase
      .from("manifests")
      .select("id, label, description, manifest, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching manifests:", error)
      return NextResponse.json({ error: "Failed to fetch manifests" }, { status: 500 })
    }

    if (!manifests || manifests.length === 0) {
      return NextResponse.json({ error: "No manifests found" }, { status: 404 })
    }

    // Create a new zip file
    const zip = new JSZip()

    // Create a folder for the manifests
    const folderName = `iiif-manifests-${new Date().toISOString().split("T")[0]}`
    const manifestsFolder = zip.folder(folderName)

    if (!manifestsFolder) {
      throw new Error("Failed to create folder in zip file")
    }

    // Add each manifest to the folder in the zip file
    manifests.forEach((manifest) => {
      const fileName = `manifest-${manifest.label.toLowerCase().replace(/\s+/g, "-")}-${manifest.id}.json`
      const content = JSON.stringify(manifest.manifest, null, 2)
      manifestsFolder.file(fileName, content)
    })

    // Add a README file to the folder
    const readmeContent = `# IIIF Manifests Export

This folder contains IIIF Presentation API manifests exported from the IIIF Manifest Generator on ${new Date().toLocaleString()}.

## Contents

This export contains ${manifests.length} manifest(s):

${manifests.map((m, i) => `${i + 1}. ${m.label}${m.description ? ` - ${m.description}` : ""}`).join("\n")}

## Usage

These manifest files can be loaded into any IIIF-compatible viewer or repository.
Each file follows the IIIF Presentation API 3.0 specification.
`

    manifestsFolder.file("README.md", readmeContent)

    // Generate the zip file with proper compression
    const zipContent = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: {
        level: 6, // Medium compression level (0-9)
      },
    })

    // Return the zip file with proper headers
    const zipFilename = `${folderName}.zip`

    return new Response(zipContent, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
        "Content-Length": zipContent.length.toString(),
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    console.error("Error creating zip file:", error)
    return NextResponse.json(
      { error: "Failed to create zip file", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
