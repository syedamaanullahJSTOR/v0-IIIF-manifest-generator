"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, AlertCircle, Loader2, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type BasicIIIFViewerProps = {
  manifestId: string | null
  className?: string
}

export default function BasicIIIFViewer({ manifestId, className }: BasicIIIFViewerProps) {
  const [manifest, setManifest] = useState<any>(null)
  const [currentCanvas, setCurrentCanvas] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!manifestId) return

    setLoading(true)
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
        setError(err instanceof Error ? err.message : "Failed to load manifest")

        toast({
          title: "Error loading manifest",
          description: err instanceof Error ? err.message : "Failed to load manifest",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchManifest()
  }, [manifestId, toast])

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

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 3))
  }

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5))
  }

  const handleOpenImageInNewTab = () => {
    if (imageUrl) {
      window.open(imageUrl, "_blank")
    }
  }

  if (!manifestId) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-muted-foreground">Select a manifest to view</div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <div className="text-muted-foreground">Loading manifest...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center h-[400px]">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-medium mb-2">Error loading manifest</h3>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </CardContent>
      </Card>
    )
  }

  if (!manifest || !manifest.items || manifest.items.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center h-[400px]">
          <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">Invalid Manifest</h3>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
            The manifest does not contain any images or has an invalid format.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Get the current canvas
  const canvas = manifest.items[currentCanvas]
  const canvasLabel = canvas.label?.en?.[0] || "Image"

  if (!imageUrl) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center h-[400px]">
          <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">Image Not Found</h3>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
            Could not extract a valid image URL from the manifest.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="p-4 h-[400px] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm">
            Image {currentCanvas + 1} of {manifest.items.length}: {canvasLabel}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleZoomOut} disabled={zoomLevel <= 0.5}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleZoomIn} disabled={zoomLevel >= 3}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleOpenImageInNewTab}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative flex-1 overflow-auto">
          <div
            className="relative w-full h-full flex items-center justify-center"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center" }}
          >
            <Image src={imageUrl || "/placeholder.svg"} alt={canvasLabel} fill className="object-contain" unoptimized />
          </div>
        </div>

        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={handlePrevious} disabled={currentCanvas === 0}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <Button variant="outline" onClick={handleNext} disabled={currentCanvas >= manifest.items.length - 1}>
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
