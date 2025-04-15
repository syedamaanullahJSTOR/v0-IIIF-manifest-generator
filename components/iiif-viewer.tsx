"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Loader2, AlertCircle, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

type IIIFViewerProps = {
  manifestId: string | null
  manifests: Array<{
    id: string
  }>
  className?: string
  onError?: (error: string) => void
}

export default function IIIFViewer({ manifestId, manifests, className, onError }: IIIFViewerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [manifest, setManifest] = useState<any>(null)
  const [currentCanvas, setCurrentCanvas] = useState(0)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  // Load manifest
  useEffect(() => {
    if (!manifestId) return

    setIsLoading(true)
    setError(null)

    const fetchManifest = async () => {
      try {
        const baseUrl = window.location.origin
        const response = await fetch(`${baseUrl}/api/manifests/iiif/${manifestId}?t=${Date.now()}`)

        if (!response.ok) {
          const errorData = await response.json()
          console.error("Error response from manifest API:", errorData)
          throw new Error(`Failed to load manifest: ${response.status} ${errorData.error || ""}`)
        }

        const data = await response.json()
        console.log("Manifest loaded successfully:", data)

        if (!data || !data.items || !Array.isArray(data.items) || data.items.length === 0) {
          throw new Error("Invalid manifest format: missing items array or empty items")
        }

        setManifest(data)
        setCurrentCanvas(0)
      } catch (err) {
        console.error("Error loading manifest:", err)
        const errorMsg = err instanceof Error ? err.message : "Failed to load manifest"
        setError(errorMsg)
        if (onError) onError(errorMsg)
      } finally {
        setIsLoading(false)
      }
    }

    fetchManifest()
  }, [manifestId, onError])

  // Extract image URL when canvas changes
  useEffect(() => {
    if (!manifest || !manifest.items || !manifest.items[currentCanvas]) {
      setImageUrl(null)
      return
    }

    try {
      const canvas = manifest.items[currentCanvas]

      if (!canvas.items || !canvas.items[0] || !canvas.items[0].items || !canvas.items[0].items[0]) {
        console.error("Invalid canvas structure:", canvas)
        setImageUrl(null)
        return
      }

      const annotation = canvas.items[0].items[0]

      if (!annotation.body || !annotation.body.id) {
        console.error("Invalid annotation structure:", annotation)
        setImageUrl(null)
        return
      }

      const url = annotation.body.id
      console.log("Image URL extracted from manifest:", url)
      setImageUrl(url)
    } catch (err) {
      console.error("Error extracting image URL:", err)
      setImageUrl(null)
    }
  }, [manifest, currentCanvas])

  const handlePrevious = () => {
    if (manifest && currentCanvas > 0) {
      setCurrentCanvas(currentCanvas - 1)
    }
  }

  const handleNext = () => {
    if (manifest && currentCanvas < manifest.items.length - 1) {
      setCurrentCanvas(currentCanvas + 1)
    }
  }

  const handleViewRawManifest = () => {
    if (manifestId) {
      window.open(`${window.location.origin}/api/debug/manifest/${manifestId}`, "_blank")
    }
  }

  const handleOpenImageInNewTab = () => {
    if (imageUrl) {
      window.open(imageUrl, "_blank")
    }
  }

  if (!manifestId) {
    return (
      <Card className="flex items-center justify-center h-[500px] text-muted-foreground">
        Select a manifest to view in the IIIF viewer
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className={cn("w-full h-[500px]", className)}>
        <div className="flex flex-col items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <div className="text-muted-foreground">Loading manifest...</div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn("w-full h-[500px]", className)}>
        <div className="flex flex-col items-center justify-center h-full p-6">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-medium mb-2">Error loading viewer</h3>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">{error}</p>
          <div className="flex gap-4">
            <Button onClick={() => window.location.reload()}>Try Again</Button>
            <Button variant="outline" onClick={handleViewRawManifest}>
              View Raw Manifest
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  if (!imageUrl) {
    return (
      <Card className={cn("w-full h-[500px]", className)}>
        <div className="flex flex-col items-center justify-center h-full p-6">
          <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">Image Not Found</h3>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
            Could not extract a valid image URL from the manifest.
          </p>
          <Button variant="outline" onClick={handleViewRawManifest}>
            View Raw Manifest Data
          </Button>
        </div>
      </Card>
    )
  }

  // Get the current canvas
  const canvas = manifest.items[currentCanvas]
  const canvasLabel = canvas.label?.en?.[0] || "Image"

  return (
    <Card className={cn("w-full h-[500px]", className)}>
      <div className="p-4 h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm">
            Image {currentCanvas + 1} of {manifest.items.length}: {canvasLabel}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleOpenImageInNewTab}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative flex-1 overflow-auto">
          <div className="relative w-full h-full flex items-center justify-center">
            <Image src={imageUrl || "/placeholder.svg"} alt={canvasLabel} fill className="object-contain" unoptimized />
          </div>
        </div>

        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={handlePrevious} disabled={currentCanvas === 0}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <Button variant="outline" onClick={handleViewRawManifest}>
            View Raw Data
          </Button>
          <Button variant="outline" onClick={handleNext} disabled={currentCanvas >= manifest.items.length - 1}>
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
