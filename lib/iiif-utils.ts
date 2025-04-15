/**
 * Generates a IIIF manifest for a collection of files
 * @param files Array of file objects with file paths
 * @param label Label for the manifest
 * @param description Optional description for the manifest
 * @returns A IIIF Presentation API 3.0 compliant manifest
 */
export function generateIIIFManifest(
  files: Array<{ id: string; file: File; filePath: string; fileId: string; type: string }>,
  label: string,
  description?: string,
  baseUrl: string,
  metadata?: any,
) {
  console.log(
    "Generating IIIF manifest with files:",
    files.map((f) => ({ id: f.id, filePath: f.filePath, type: f.type })),
  )

  // Create metadata array from Dublin Core fields
  const metadataArray = metadata
    ? Object.entries(metadata)
        .filter(([key, value]) => value && key !== "title" && key !== "description")
        .map(([key, value]) => ({
          label: { en: [key.charAt(0).toUpperCase() + key.slice(1)] },
          value: { en: [value as string] },
        }))
    : []

  // Filter for image files
  const imageFiles = files.filter((file) => file.type === "image")
  console.log("Image files for manifest:", imageFiles.length)

  if (imageFiles.length === 0) {
    console.warn("No image files found for manifest generation")
  }

  // Generate a unique ID for the manifest
  const manifestId = crypto.randomUUID()

  // Create a proper IIIF manifest with canvases for each image
  const manifest = {
    "@context": "http://iiif.io/api/presentation/3/context.json",
    id: `${baseUrl}/api/manifests/iiif/${manifestId}`,
    type: "Manifest",
    label: { en: [label] },
    summary: description ? { en: [description] } : undefined,
    metadata: metadataArray.length > 0 ? metadataArray : undefined,
    items: imageFiles.map((file, index) => {
      // Create a unique canvas ID
      const canvasId = `${baseUrl}/canvas/${file.id}`

      // Get direct URL to the image from Supabase
      // Use the storage.from().getPublicUrl() pattern that's used in the UI
      const imageUrl = `${baseUrl}/api/direct-image/${file.filePath}`

      // Default dimensions - we'll use 1000x1000 as a fallback
      const width = 1000
      const height = 1000

      return {
        id: canvasId,
        type: "Canvas",
        label: { en: [file.file.name] },
        height: height,
        width: width,
        items: [
          {
            id: `${canvasId}/page`,
            type: "AnnotationPage",
            items: [
              {
                id: `${canvasId}/page/annotation`,
                type: "Annotation",
                motivation: "painting",
                body: {
                  id: imageUrl,
                  type: "Image",
                  format: "image/jpeg",
                  height: height,
                  width: width,
                },
                target: canvasId,
              },
            ],
          },
        ],
      }
    }),
    thumbnail:
      imageFiles.length > 0
        ? [
            {
              id: `${baseUrl}/api/direct-image/${imageFiles[0].filePath}`,
              type: "Image",
              format: "image/jpeg",
            },
          ]
        : undefined,
    rights: metadata?.rights,
    requiredStatement: metadata?.rights
      ? {
          label: { en: ["Rights"] },
          value: { en: [metadata.rights] },
        }
      : undefined,
    provider: metadata?.publisher
      ? [
          {
            id: `${baseUrl}/provider`,
            type: "Agent",
            label: { en: [metadata.publisher] },
          },
        ]
      : undefined,
    viewingDirection: "left-to-right",
  }

  console.log("Generated IIIF manifest:", JSON.stringify(manifest, null, 2).substring(0, 500) + "...")
  return manifest
}
