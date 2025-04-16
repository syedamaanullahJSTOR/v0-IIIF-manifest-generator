"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ExternalLink, Download, Check, AlertCircle } from "lucide-react"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"

type ExternalImage = {
  id: string
  label: string
  thumbnailUrl: string
  imageUrl: string
  selected: boolean
  width?: number
  height?: number
  format?: string
}

type ExternalManifestImporterProps = {
  onImagesSelected: (images: Omit<ExternalImage, "selected">[]) => void
}

export default function ExternalManifestImporter({ onImagesSelected }: ExternalManifestImporterProps) {
  const [manifestUrl, setManifestUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manifestData, setManifestData] = useState<any>(null)
  const [images, setImages] = useState<ExternalImage[]>([])
  const { toast } = useToast()

  const fetchManifest = async () => {
    if (!manifestUrl) {
      toast({
        title: "URL required",
        description: "Please enter a valid IIIF manifest URL",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setError(null)
    setManifestData(null)
    setImages([])

    try {
      // Use a proxy API route to avoid CORS issues
      const response = await fetch("/api/fetch-external-manifest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: manifestUrl }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch manifest")
      }

      const data = await response.json()
      setManifestData(data)

      // Extract images from the manifest
      const extractedImages = extractImagesFromManifest(data)
      setImages(extractedImages)

      if (extractedImages.length === 0) {
        toast({
          title: "No images found",
          description: "The manifest doesn't contain any images that can be imported",
          variant: "warning",
        })
      } else {
        toast({
          title: "Manifest loaded",
          description: `Found ${extractedImages.length} images in the manifest`,
        })
      }
    } catch (error) {
      console.error("Error fetching manifest:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch manifest")
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch manifest",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const extractImagesFromManifest = (manifest: any): ExternalImage[] => {
    const images: ExternalImage[] = []

    try {
      // Check if it's a IIIF Presentation API 3.0 manifest
      if (manifest.items && Array.isArray(manifest.items)) {
        // Process canvases from Presentation API 3.0
        manifest.items.forEach((canvas: any, index: number) => {
          try {
            // Get the label
            let label = `Image ${index + 1}`
            if (canvas.label) {
              if (typeof canvas.label === "string") {
                label = canvas.label
              } else if (canvas.label.en && Array.isArray(canvas.label.en) && canvas.label.en.length > 0) {
                label = canvas.label.en[0]
              } else if (canvas.label["@value"]) {
                label = canvas.label["@value"]
              }
            }

            // Get the image URL from the annotation
            let imageUrl = null
            let thumbnailUrl = null
            let width = 1000
            let height = 1000
            let format = "image/jpeg"

            // Try to find the image in the items array
            if (canvas.items && Array.isArray(canvas.items) && canvas.items.length > 0) {
              const annotationPage = canvas.items[0]
              if (annotationPage.items && Array.isArray(annotationPage.items) && annotationPage.items.length > 0) {
                const annotation = annotationPage.items[0]
                if (annotation.body) {
                  if (annotation.body.id) {
                    imageUrl = annotation.body.id
                    thumbnailUrl = annotation.body.id
                    if (annotation.body.width) width = annotation.body.width
                    if (annotation.body.height) height = annotation.body.height
                    if (annotation.body.format) format = annotation.body.format
                  } else if (annotation.body.service && Array.isArray(annotation.body.service)) {
                    const service = annotation.body.service[0]
                    if (service.id) {
                      imageUrl = `${service.id}/full/max/0/default.jpg`
                      thumbnailUrl = `${service.id}/full/200,/0/default.jpg`
                    }
                  }
                }
              }
            }

            // If we found an image URL, add it to the list
            if (imageUrl) {
              images.push({
                id: `external-${index}`,
                label,
                thumbnailUrl,
                imageUrl,
                selected: false,
                width,
                height,
                format,
              })
            }
          } catch (err) {
            console.error("Error processing canvas:", err)
          }
        })
      } else if (manifest.sequences && Array.isArray(manifest.sequences)) {
        // Process canvases from Presentation API 2.0
        manifest.sequences.forEach((sequence: any) => {
          if (sequence.canvases && Array.isArray(sequence.canvases)) {
            sequence.canvases.forEach((canvas: any, index: number) => {
              try {
                // Get the label
                let label = `Image ${index + 1}`
                if (canvas.label) {
                  label = canvas.label
                }

                // Get the image URL from the image annotation
                let imageUrl = null
                let thumbnailUrl = null
                let width = 1000
                let height = 1000
                let format = "image/jpeg"

                if (canvas.images && Array.isArray(canvas.images) && canvas.images.length > 0) {
                  const image = canvas.images[0]
                  if (image.resource) {
                    if (image.resource["@id"]) {
                      imageUrl = image.resource["@id"]
                      thumbnailUrl = image.resource["@id"]
                      if (image.resource.width) width = image.resource.width
                      if (image.resource.height) height = image.resource.height
                      if (image.resource.format) format = image.resource.format
                    } else if (image.resource.service && image.resource.service["@id"]) {
                      const serviceId = image.resource.service["@id"]
                      imageUrl = `${serviceId}/full/max/0/default.jpg`
                      thumbnailUrl = `${serviceId}/full/200,/0/default.jpg`
                    }
                  }
                }

                // If we found an image URL, add it to the list
                if (imageUrl) {
                  images.push({
                    id: `external-${index}`,
                    label,
                    thumbnailUrl,
                    imageUrl,
                    selected: false,
                    width,
                    height,
                    format,
                  })
                }
              } catch (err) {
                console.error("Error processing canvas:", err)
              }
            })
          }
        })
      }
    } catch (err) {
      console.error("Error extracting images from manifest:", err)
    }

    return images
  }

  const toggleImageSelection = (id: string) => {
    setImages((prev) => prev.map((image) => (image.id === id ? { ...image, selected: !image.selected } : image)))
  }

  const handleImport = () => {
    const selectedImages = images.filter((image) => image.selected)
    if (selectedImages.length === 0) {
      toast({
        title: "No images selected",
        description: "Please select at least one image to import",
        variant: "destructive",
      })
      return
    }

    // Remove the selected property before passing to the parent
    const imagesForImport = selectedImages.map(({ selected, ...rest }) => rest)
    onImagesSelected(imagesForImport)

    toast({
      title: "Images imported",
      description: `${selectedImages.length} images have been imported successfully`,
    })
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-serif font-semibold mb-4">Import from External IIIF Manifest</h2>

        <div className="space-y-4">
          <div className="flex flex-col space-y-1">
            <Label htmlFor="manifest-url" className="font-sans">
              IIIF Manifest URL
            </Label>
            <div className="flex gap-2">
              <Input
                id="manifest-url"
                value={manifestUrl}
                onChange={(e) => setManifestUrl(e.target.value)}
                placeholder="https://example.org/iiif/manifest.json"
                className="rounded-none font-sans flex-1"
              />
              <Button
                onClick={fetchManifest}
                disabled={isLoading || !manifestUrl}
                className="bg-black hover:bg-black/90 text-white font-sans"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Fetch
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 p-3 rounded-md flex items-start">
              <AlertCircle className="h-5 w-5 text-destructive mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {images.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-serif font-medium">Available Images</h3>
                <p className="text-sm text-muted-foreground font-sans">
                  {images.filter((img) => img.selected).length} of {images.length} selected
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto p-1">
                {images.map((image) => (
                  <div
                    key={image.id}
                    className={`border rounded-md overflow-hidden cursor-pointer transition-all ${
                      image.selected ? "ring-2 ring-primary" : "hover:border-primary"
                    }`}
                    onClick={() => toggleImageSelection(image.id)}
                  >
                    <div className="aspect-square relative bg-muted">
                      <Image
                        src={image.thumbnailUrl || "/placeholder.svg"}
                        alt={image.label}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                      {image.selected && (
                        <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{image.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleImport}
                  disabled={images.filter((img) => img.selected).length === 0}
                  className="bg-jstor-red hover:bg-jstor-red/90 text-white font-sans"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Import Selected Images
                </Button>
              </div>
            </div>
          )}

          {manifestData && images.length === 0 && !isLoading && (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-serif font-medium mb-2">No Images Found</h3>
              <p className="text-muted-foreground mb-4 font-sans">
                The manifest was loaded successfully, but no images could be extracted.
              </p>
            </div>
          )}

          {!manifestData && !isLoading && !error && (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <ExternalLink className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-serif font-medium mb-2">Enter a IIIF Manifest URL</h3>
              <p className="text-muted-foreground mb-4 font-sans">
                Paste a URL to an external IIIF manifest to import images from it.
              </p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Example: https://iiif.harvardartmuseums.org/manifests/object/299843
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
