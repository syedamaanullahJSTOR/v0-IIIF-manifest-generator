"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react"

type SimpleIIIFViewerProps = {
  manifestId: string
  className?: string
}

export default function SimpleIIIFViewer({ manifestId, className }: SimpleIIIFViewerProps) {
  const [manifest, setManifest] = useState<any>(null)
  const [currentCanvas, setCurrentCanvas] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)

  useEffect(() => {
    if (!manifestId) return

    setLoading(true)
    setError(null)

    const fetchManifest = async () => {
      try {
        const baseUrl = window.location.origin
        const response = await fetch(`${baseUrl}/api/manifests/iiif/${manifestId}?t=${Date.now()}`)

        if (!response.ok) {
          throw new Error(`Failed to load manifest: ${response.status}`)
        }

        const data = await response.json()
        setManifest(data)
        setCurrentCanvas(0)
      } catch (err) {
        console.error("Error loading manifest:", err)
        setError(err instanceof Error ? err.message : "Failed to load manifest")
      } finally {
        setLoading(false)
      }
    }

    fetchManifest()
  }, [manifestId])

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

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-[500px]">
          <div className="animate-pulse">Loading manifest...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center h-[500px]">
          <div className="text-destructive mb-4">Error: {error}</div>
          <Button onClick={() => window.open(`/api/manifests/iiif/${manifestId}`, "_blank")}>View Raw Manifest</Button>
        </CardContent>
      </Card>
    )
  }

  if (!manifest || !manifest.items || manifest.items.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-[500px]">
          <div>No images found in manifest</div>
        </CardContent>
      </Card>
    )
  }

  // Get the current canvas and image
  const canvas = manifest.items[currentCanvas]
  const image = canvas?.items?.[0]?.items?.[0]?.body

  if (!image) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-[500px]">
          <div>No image data found in manifest</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="p-4 h-[500px] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm">
            Image {currentCanvas + 1} of {manifest.items.length}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleZoomOut} disabled={zoomLevel <= 0.5}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleZoomIn} disabled={zoomLevel >= 3}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative flex-1 overflow-auto">
          <div
            className="relative w-full h-full flex items-center justify-center"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center" }}
          >
            <Image
              src={image.id || "/placeholder.svg"}
              alt={canvas.label?.en?.[0] || "IIIF image"}
              fill
              className="object-contain"
              unoptimized
            />
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
