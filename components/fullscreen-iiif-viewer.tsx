"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X, ExternalLink } from "lucide-react"

type FullscreenIIIFViewerProps = {
  manifestId: string
  onClose: () => void
}

export default function FullscreenIIIFViewer({ manifestId, onClose }: FullscreenIIIFViewerProps) {
  const [manifest, setManifest] = useState<any>(null)
  const [currentCanvas, setCurrentCanvas] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    const fetchManifest = async () => {
      try {
        setLoading(true)
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

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      } else if (e.key === "ArrowLeft") {
        handlePrevious()
      } else if (e.key === "ArrowRight") {
        handleNext()
      } else if (e.key === "+" || e.key === "=") {
        handleZoomIn()
      } else if (e.key === "-") {
        handleZoomOut()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose, manifest, currentCanvas])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center">
        <div className="text-white text-xl mb-4">Error: {error}</div>
        <Button onClick={onClose} variant="outline">
          Close
        </Button>
      </div>
    )
  }

  if (!manifest || !manifest.items || manifest.items.length === 0 || !imageUrl) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center">
        <div className="text-white text-xl mb-4">No image data found</div>
        <Button onClick={onClose} variant="outline">
          Close
        </Button>
      </div>
    )
  }

  // Get the current canvas
  const canvas = manifest.items[currentCanvas]
  const canvasLabel = canvas.label?.en?.[0] || "Image"

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* Top bar */}
      <div className="flex justify-between items-center p-4 bg-black">
        <div className="text-white font-serif">
          {canvasLabel} ({currentCanvas + 1} of {manifest.items.length})
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={zoomLevel <= 0.5}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={zoomLevel >= 3}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenImageInNewTab}>
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 relative overflow-hidden">
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center", transition: "transform 0.2s" }}
        >
          <Image
            src={imageUrl || "/placeholder.svg"}
            alt={canvasLabel}
            fill
            className="object-contain"
            unoptimized
            sizes="100vw"
            priority
          />
        </div>

        {/* Navigation buttons */}
        <div className="absolute inset-y-0 left-0 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70"
            onClick={handlePrevious}
            disabled={currentCanvas === 0}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
        </div>

        <div className="absolute inset-y-0 right-0 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70"
            onClick={handleNext}
            disabled={currentCanvas >= manifest.items.length - 1}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        </div>
      </div>

      {/* Bottom info bar */}
      <div className="p-4 bg-black text-white text-sm font-sans">
        Use arrow keys to navigate, +/- to zoom, ESC to close
      </div>
    </div>
  )
}
