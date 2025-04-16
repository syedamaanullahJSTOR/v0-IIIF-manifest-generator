"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Download, Eye, Loader2, RefreshCw, Archive, Plus, ImageIcon, FileText, X, Check } from "lucide-react"
import { generateIIIFManifest } from "@/lib/iiif-utils"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import Image from "next/image"
import BasicIIIFViewer from "@/components/basic-iiif-viewer"
import FullscreenIIIFViewer from "@/components/fullscreen-iiif-viewer"
import { uploadToSupabase } from "@/lib/upload-service"
import ExternalManifestImporter from "@/components/external-manifest-importer"

type UploadedFile = {
  id: string
  file: File
  preview: string
  type: "image" | "document"
  filePath?: string
  fileId?: string
  status: "pending" | "uploading" | "uploaded" | "error"
  progress?: number
  error?: string
  externalImageUrl?: string
  externalImage?: boolean
}

type Manifest = {
  id: string
  label: string
  description: string
  manifest: any
  created_at: string
}

type DublinCoreMetadata = {
  title: string
  creator: string
  subject: string
  description: string
  publisher: string
  contributor: string
  date: string
  type: string
  format: string
  identifier: string
  source: string
  language: string
  relation: string
  coverage: string
  rights: string
}

type ManifestCardProps = {
  manifest: Manifest
  isActive: boolean
  onClick: () => void
  onView: (e: React.MouseEvent) => void
  onDownload: (e: React.MouseEvent) => void
  onThumbnailClick: () => void
  getManifestThumbnailUrl: (manifest: Manifest) => string | null
}

type ExternalImage = {
  id: string
  label: string
  thumbnailUrl: string
  imageUrl: string
  width?: number
  height?: number
  format?: string
}

const ManifestCard = ({
  manifest,
  isActive,
  onClick,
  onView,
  onDownload,
  onThumbnailClick,
  getManifestThumbnailUrl,
}: ManifestCardProps) => {
  const [imageError, setImageError] = useState(false)
  const thumbnailUrl = getManifestThumbnailUrl(manifest)

  return (
    <div
      className={cn(
        "border rounded-lg overflow-hidden cursor-pointer transition-colors hover:border-primary",
        isActive ? "ring-2 ring-primary" : "",
      )}
      onClick={onClick}
    >
      <div
        className="h-40 bg-muted relative cursor-pointer"
        onClick={(e) => {
          e.stopPropagation()
          onThumbnailClick()
        }}
      >
        {thumbnailUrl && !imageError ? (
          <Image
            src={thumbnailUrl || "/placeholder.svg"}
            alt={manifest.label}
            fill
            className="object-cover"
            unoptimized
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-opacity flex items-center justify-center">
          <span className="text-white opacity-0 hover:opacity-100 font-sans">Click to view fullscreen</span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-medium truncate">{manifest.label}</h3>
        {manifest.description && <p className="text-sm text-muted-foreground truncate">{manifest.description}</p>}
        <p className="text-xs text-muted-foreground mt-2">{new Date(manifest.created_at).toLocaleString()}</p>
        <div className="flex gap-2 mt-3">
          <Button variant="outline" size="sm" className="flex-1" onClick={onView}>
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={onDownload}>
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ManifestGenerator() {
  const [activeTab, setActiveTab] = useState("create")
  const [metadataTab, setMetadataTab] = useState("basic")
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [manifests, setManifests] = useState<Manifest[]>([])
  const [activeManifest, setActiveManifest] = useState<string | null>(null)
  const [fullscreenManifest, setFullscreenManifest] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDownloadingAll, setIsDownloadingAll] = useState(false)
  const [metadata, setMetadata] = useState<DublinCoreMetadata>({
    title: "",
    creator: "",
    subject: "",
    description: "",
    publisher: "",
    contributor: "",
    date: "",
    type: "",
    format: "",
    identifier: "",
    source: "",
    language: "",
    relation: "",
    coverage: "",
    rights: "",
  })
  const { toast } = useToast()
  const fileInputRef = useState<HTMLInputElement | null>(null)
  const [imageErrorStates, setImageErrorStates] = useState<{ [key: string]: boolean }>({})
  const [externalImages, setExternalImages] = useState<ExternalImage[]>([])
  const [importTab, setImportTab] = useState<"upload" | "external">("upload")

  // Initialize app on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize storage
        await fetch("/api/init-storage")

        // Setup database silently
        try {
          await fetch("/api/setup-db")
        } catch (error) {
          console.log("Database setup error (silent):", error)
        }

        // Fetch manifests
        await fetchManifests()
      } catch (error) {
        console.error("Error initializing app:", error)
      }
    }

    initializeApp()
  }, [])

  const fetchManifests = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/manifests")

      if (!response.ok) {
        throw new Error("Failed to fetch manifests")
      }

      const data = await response.json()
      setManifests(data)

      // Set the first manifest as active if there are any
      if (data.length > 0 && !activeManifest) {
        setActiveManifest(data[0].id)
      }
    } catch (error) {
      console.error("Error fetching manifests:", error)
      toast({
        title: "Error",
        description: "Failed to load manifests",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    const newFiles: UploadedFile[] = []

    Array.from(selectedFiles).forEach((file) => {
      const id = crypto.randomUUID()
      const isImage = file.type.startsWith("image/")

      newFiles.push({
        id,
        file,
        preview: isImage ? URL.createObjectURL(file) : "",
        type: isImage ? "image" : "document",
        status: "pending",
        progress: 0,
      })
    })

    setFiles((prev) => [...prev, ...newFiles])

    // Reset the input value
    e.target.value = ""

    // Automatically start uploading the files
    for (const file of newFiles) {
      await uploadFile(file)
    }
  }

  const uploadFile = async (file: UploadedFile) => {
    try {
      setIsUploading(true)

      // Update file status to uploading
      setFiles((prev) => {
        const updated = [...prev]
        const index = updated.findIndex((f) => f.id === file.id)
        if (index !== -1) {
          updated[index] = { ...updated[index], status: "uploading", progress: 0 }
        }
        return updated
      })

      // Upload the file
      const { fileId, filePath } = await uploadToSupabase(file.file, (progress) => {
        setFiles((prev) => {
          const updated = [...prev]
          const index = updated.findIndex((f) => f.id === file.id)
          if (index !== -1) {
            updated[index] = { ...updated[index], progress }
          }
          return updated
        })
      })

      // Update file with success info
      setFiles((prev) => {
        const updated = [...prev]
        const index = updated.findIndex((f) => f.id === file.id)
        if (index !== -1) {
          updated[index] = {
            ...updated[index],
            fileId,
            filePath,
            status: "uploaded",
            progress: 100,
          }
        }
        return updated
      })

      toast({
        title: "File uploaded",
        description: `${file.file.name} has been uploaded successfully.`,
      })
    } catch (error) {
      console.error("Error uploading file:", error)

      // Update file with error info
      setFiles((prev) => {
        const updated = [...prev]
        const index = updated.findIndex((f) => f.id === file.id)
        if (index !== -1) {
          updated[index] = {
            ...updated[index],
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          }
        }
        return updated
      })

      toast({
        title: "Upload failed",
        description: `Failed to upload ${file.file.name}.`,
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === id)
      if (fileToRemove && fileToRemove.type === "image" && !fileToRemove.externalImage) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      return prev.filter((f) => f.id !== id)
    })
  }

  const handleInputChange = (field: keyof DublinCoreMetadata, value: string) => {
    setMetadata((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleExternalImagesSelected = (images: ExternalImage[]) => {
    setExternalImages(images)
    setImportTab("upload") // Switch back to upload tab to show the imported images

    // Convert external images to UploadedFile format
    const newFiles: UploadedFile[] = images.map((image) => {
      const id = crypto.randomUUID()
      // Create a dummy File object with the image label as the name
      const dummyFile = new File([], image.label || "External Image", { type: image.format || "image/jpeg" })

      return {
        id,
        file: dummyFile,
        preview: image.thumbnailUrl,
        type: "image",
        status: "uploaded",
        progress: 100,
        filePath: image.imageUrl, // Store the external URL in filePath
        externalImage: true, // Flag to identify external images
      }
    })

    setFiles((prev) => [...prev, ...newFiles])

    toast({
      title: "External images imported",
      description: `${images.length} images have been imported from the external manifest.`,
    })
  }

  const generateManifest = async () => {
    if (!metadata.title) {
      toast({
        title: "Title required",
        description: "Please provide a title for your manifest.",
        variant: "destructive",
      })
      return
    }

    const validFiles = files.filter((file) => file.status === "uploaded")

    if (validFiles.length === 0) {
      toast({
        title: "No files",
        description: "Please upload at least one file before generating a manifest.",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)

    try {
      // Get the base URL for our API endpoints
      const baseUrl = window.location.origin

      // Prepare files for manifest generation
      const filesForManifest = validFiles.map((file) => {
        // If it's an external image, use the external URL
        if (file.externalImage) {
          return {
            id: file.id,
            file: file.file,
            filePath: file.filePath || "", // Use the external URL directly
            fileId: "external", // Use a placeholder for external images
            type: "image",
            externalImage: true,
          }
        }
        // Otherwise, use the uploaded file
        return {
          id: file.id,
          file: file.file,
          filePath: file.filePath || "",
          fileId: file.fileId || "",
          type: file.type,
        }
      })

      // Generate the IIIF manifest
      const manifestData = generateIIIFManifest(
        filesForManifest as any,
        metadata.title,
        metadata.description,
        baseUrl,
        metadata,
      )

      // Only include valid fileIds (from local files) for database linking
      const fileIds = validFiles
        .filter((file) => !file.externalImage && file.fileId)
        .map((file) => file.fileId as string)

      // Count external images
      const externalImagesCount = validFiles.filter((file) => file.externalImage).length

      // Store the manifest in Supabase
      const response = await fetch("/api/manifests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          label: metadata.title,
          description: metadata.description,
          manifest: manifestData,
          fileIds,
          metadata,
          externalImagesCount,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("API error response:", errorData)
        throw new Error(`Failed to store manifest: ${errorData.details || errorData.error || response.statusText}`)
      }

      const result = await response.json()

      // Refresh the manifests list
      await fetchManifests()

      // Set the new manifest as active
      setActiveManifest(result.id)

      // Switch to the view tab
      setActiveTab("view")

      toast({
        title: "Manifest generated",
        description: "Your IIIF manifest has been generated successfully.",
      })

      // Reset the form
      setFiles([])
      setMetadata({
        title: "",
        creator: "",
        subject: "",
        description: "",
        publisher: "",
        contributor: "",
        date: "",
        type: "",
        format: "",
        identifier: "",
        source: "",
        language: "",
        relation: "",
        coverage: "",
        rights: "",
      })
    } catch (error) {
      console.error("Error generating manifest:", error)
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "An error occurred while generating the manifest.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadManifest = (manifest: Manifest) => {
    const blob = new Blob([JSON.stringify(manifest.manifest, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `manifest-${manifest.label.toLowerCase().replace(/\s+/g, "-")}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadAllManifests = async () => {
    if (manifests.length === 0) {
      toast({
        title: "No manifests",
        description: "There are no manifests to download.",
        variant: "destructive",
      })
      return
    }

    setIsDownloadingAll(true)

    try {
      toast({
        title: "Preparing download",
        description: `Creating zip file with ${manifests.length} manifests...`,
      })

      // Fetch the zip file as a blob
      const response = await fetch(`/api/download-all-manifests`)

      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status} ${response.statusText}`)
      }

      // Get the blob from the response
      const blob = await response.blob()

      // Create a URL for the blob
      const url = URL.createObjectURL(blob)

      // Create a download link and trigger it
      const a = document.createElement("a")
      a.href = url
      a.download = `iiif-manifests-${new Date().toISOString().split("T")[0]}.zip`
      document.body.appendChild(a)
      a.click()

      // Clean up
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 100)

      toast({
        title: "Download complete",
        description: `Your zip file contains a folder with ${manifests.length} manifests and a README file.`,
      })
    } catch (error) {
      console.error("Error downloading all manifests:", error)
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Failed to download manifests",
        variant: "destructive",
      })
    } finally {
      setIsDownloadingAll(false)
    }
  }

  const getManifestThumbnailUrl = (manifest: Manifest): string | null => {
    // Check if there's a dedicated thumbnail
    if (
      manifest.manifest &&
      manifest.manifest.thumbnail &&
      manifest.manifest.thumbnail[0] &&
      manifest.manifest.thumbnail[0].id
    ) {
      return manifest.manifest.thumbnail[0].id
    }

    // Try to get the first image from the manifest items
    if (manifest.manifest && manifest.manifest.items && manifest.manifest.items.length > 0) {
      const firstCanvas = manifest.manifest.items[0]
      if (firstCanvas.items && firstCanvas.items[0] && firstCanvas.items[0].items && firstCanvas.items[0].items[0]) {
        const annotation = firstCanvas.items[0].items[0]
        if (annotation.body && annotation.body.id) {
          return annotation.body.id
        }
      }
    }

    // No thumbnail found
    return null
  }

  const handleImageError = (manifestId: string) => {
    setImageErrorStates((prevState) => ({
      ...prevState,
      [manifestId]: true,
    }))
  }

  // Check if there are any uploaded files
  const hasUploadedFiles = files.some((file) => file.status === "uploaded" || file.status === "uploading")

  // Render the file preview or upload area
  const renderFileSection = () => {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-serif font-semibold">Add Content</h2>
          <div className="flex border rounded-md overflow-hidden">
            <button
              className={`px-3 py-1 text-sm font-sans ${
                importTab === "upload" ? "bg-black text-white" : "bg-white text-black hover:bg-gray-100"
              }`}
              onClick={() => setImportTab("upload")}
            >
              Upload Files
            </button>
            <button
              className={`px-3 py-1 text-sm font-sans ${
                importTab === "external" ? "bg-black text-white" : "bg-white text-black hover:bg-gray-100"
              }`}
              onClick={() => setImportTab("external")}
            >
              Import Manifest
            </button>
          </div>
        </div>

        {importTab === "upload" ? (
          // Original upload content
          <>
            {!hasUploadedFiles ? (
              // Show the upload area if no files have been uploaded
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-jstor-red h-[300px] flex items-center justify-center"
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.doc,.docx"
                />
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <h3 className="font-serif font-medium text-lg">Drag & drop files here</h3>
                  <p className="text-sm text-muted-foreground font-sans">or click to browse</p>
                </div>
              </div>
            ) : (
              // Show the file preview if files have been uploaded
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-serif font-medium">File Preview</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("file-upload")?.click()}
                    className="font-sans"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Add More Files
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                    accept="image/*,.pdf,.doc,.docx"
                  />
                </div>

                <div className="border rounded-lg p-4 h-[400px] overflow-y-auto">
                  <div className="space-y-4">
                    {files.map((file) => (
                      <div key={file.id} className="relative group border rounded-md overflow-hidden">
                        <div className="flex items-start">
                          <div className="h-32 w-32 bg-muted relative flex-shrink-0">
                            {file.type === "image" ? (
                              <Image
                                src={file.preview || "/placeholder.svg"}
                                alt={file.file.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <FileText className="h-12 w-12 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          <div className="p-3 flex-1">
                            <p className="font-serif font-medium truncate">{file.file.name}</p>
                            <p className="text-xs text-muted-foreground mt-1 font-sans">
                              {file.externalImage ? "External Image" : `${(file.file.size / 1024).toFixed(1)} KB`}
                            </p>

                            {file.status === "uploading" ? (
                              <div className="mt-2">
                                <div className="flex items-center">
                                  <Loader2 className="h-3 w-3 animate-spin text-primary mr-2" />
                                  <span className="text-xs font-sans">Uploading: {file.progress}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                                  <div
                                    className="h-full bg-primary transition-all"
                                    style={{ width: `${file.progress}%` }}
                                  ></div>
                                </div>
                              </div>
                            ) : file.status === "uploaded" ? (
                              <p className="text-xs text-green-600 flex items-center mt-2 font-sans">
                                <Check className="h-3 w-3 mr-1" />
                                {file.externalImage ? "External image ready" : "Uploaded successfully"}
                              </p>
                            ) : file.status === "error" ? (
                              <p className="text-xs text-destructive mt-2 font-sans">{file.error}</p>
                            ) : null}
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeFile(file.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground font-sans">
                      {files.length} file{files.length !== 1 ? "s" : ""} selected
                      {files.length > 0 && (
                        <span className="ml-1">({files.filter((f) => f.status === "uploaded").length} ready)</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          // External manifest import content
          <ExternalManifestImporter onImagesSelected={handleExternalImagesSelected} />
        )}
      </div>
    )
  }

  // Render the metadata section with tabs
  const renderMetadataSection = () => {
    // Custom styles for square inputs and reduced spacing
    const inputClass = "rounded-none font-sans"
    const fieldClass = "space-y-1" // Reduced from space-y-2

    return (
      <div>
        <h2 className="text-xl font-serif font-semibold mb-3">Descriptive Metadata</h2>

        <Tabs value={metadataTab} onValueChange={setMetadataTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-3 bg-jstor-grey-light">
            <TabsTrigger
              value="basic"
              className="data-[state=active]:bg-black data-[state=active]:text-white font-sans"
            >
              Basic
            </TabsTrigger>
            <TabsTrigger
              value="additional"
              className="data-[state=active]:bg-black data-[state=active]:text-white font-sans"
            >
              Additional
            </TabsTrigger>
            <TabsTrigger
              value="rights"
              className="data-[state=active]:bg-black data-[state=active]:text-white font-sans"
            >
              Rights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-3">
            <div className={fieldClass}>
              <Label htmlFor="title" className="font-sans">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={metadata.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="A name given to the resource"
                className={inputClass}
              />
            </div>

            <div className={fieldClass}>
              <Label htmlFor="creator" className="font-sans">
                Creator
              </Label>
              <Input
                id="creator"
                value={metadata.creator}
                onChange={(e) => handleInputChange("creator", e.target.value)}
                placeholder="An entity primarily responsible for making the resource"
                className={inputClass}
              />
            </div>

            <div className={fieldClass}>
              <Label htmlFor="subject" className="font-sans">
                Subject
              </Label>
              <Input
                id="subject"
                value={metadata.subject}
                onChange={(e) => handleInputChange("subject", e.target.value)}
                placeholder="The topic of the resource"
                className={inputClass}
              />
            </div>

            <div className={fieldClass}>
              <Label htmlFor="description" className="font-sans">
                Description
              </Label>
              <Textarea
                id="description"
                value={metadata.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="An account of the resource"
                rows={3}
                className={inputClass}
              />
            </div>

            <div className={fieldClass}>
              <Label htmlFor="publisher" className="font-sans">
                Publisher
              </Label>
              <Input
                id="publisher"
                value={metadata.publisher}
                onChange={(e) => handleInputChange("publisher", e.target.value)}
                placeholder="An entity responsible for making the resource available"
                className={inputClass}
              />
            </div>
          </TabsContent>

          <TabsContent value="additional" className="space-y-3">
            <div className={fieldClass}>
              <Label htmlFor="contributor" className="font-sans">
                Contributor
              </Label>
              <Input
                id="contributor"
                value={metadata.contributor}
                onChange={(e) => handleInputChange("contributor", e.target.value)}
                placeholder="An entity responsible for making contributions to the resource"
                className={inputClass}
              />
            </div>

            <div className={fieldClass}>
              <Label htmlFor="date" className="font-sans">
                Date
              </Label>
              <Input
                id="date"
                value={metadata.date}
                onChange={(e) => handleInputChange("date", e.target.value)}
                placeholder="A point or period of time associated with the resource"
                className={inputClass}
              />
            </div>

            <div className={fieldClass}>
              <Label htmlFor="type" className="font-sans">
                Type
              </Label>
              <Input
                id="type"
                value={metadata.type}
                onChange={(e) => handleInputChange("type", e.target.value)}
                placeholder="The nature or genre of the resource"
                className={inputClass}
              />
            </div>

            <div className={fieldClass}>
              <Label htmlFor="format" className="font-sans">
                Format
              </Label>
              <Input
                id="format"
                value={metadata.format}
                onChange={(e) => handleInputChange("format", e.target.value)}
                placeholder="The file format, physical medium, or dimensions of the resource"
                className={inputClass}
              />
            </div>

            <div className={fieldClass}>
              <Label htmlFor="identifier" className="font-sans">
                Identifier
              </Label>
              <Input
                id="identifier"
                value={metadata.identifier}
                onChange={(e) => handleInputChange("identifier", e.target.value)}
                placeholder="An unambiguous reference to the resource within a given context"
                className={inputClass}
              />
            </div>
          </TabsContent>

          <TabsContent value="rights" className="space-y-3">
            <div className={fieldClass}>
              <Label htmlFor="source" className="font-sans">
                Source
              </Label>
              <Input
                id="source"
                value={metadata.source}
                onChange={(e) => handleInputChange("source", e.target.value)}
                placeholder="A related resource from which the described resource is derived"
                className={inputClass}
              />
            </div>

            <div className={fieldClass}>
              <Label htmlFor="language" className="font-sans">
                Language
              </Label>
              <Input
                id="language"
                value={metadata.language}
                onChange={(e) => handleInputChange("language", e.target.value)}
                placeholder="A language of the resource"
                className={inputClass}
              />
            </div>

            <div className={fieldClass}>
              <Label htmlFor="relation" className="font-sans">
                Relation
              </Label>
              <Input
                id="relation"
                value={metadata.relation}
                onChange={(e) => handleInputChange("relation", e.target.value)}
                placeholder="A related resource"
                className={inputClass}
              />
            </div>

            <div className={fieldClass}>
              <Label htmlFor="coverage" className="font-sans">
                Coverage
              </Label>
              <Input
                id="coverage"
                value={metadata.coverage}
                onChange={(e) => handleInputChange("coverage", e.target.value)}
                placeholder="The spatial or temporal topic of the resource"
                className={inputClass}
              />
            </div>

            <div className={fieldClass}>
              <Label htmlFor="rights" className="font-sans">
                Rights
              </Label>
              <Textarea
                id="rights"
                value={metadata.rights}
                onChange={(e) => handleInputChange("rights", e.target.value)}
                placeholder="Information about rights held in and over the resource"
                rows={3}
                className={inputClass}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="pt-3 mt-3 border-t">
          <Button
            className="w-full bg-jstor-red hover:bg-jstor-red/90 text-white font-sans"
            size="lg"
            onClick={generateManifest}
            disabled={isGenerating || files.filter((f) => f.status === "uploaded").length === 0}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>Generate IIIF Manifest</>
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-serif font-bold tracking-tighter sm:text-4xl md:text-5xl text-jstor-red">
          IIIF Manifest Generator
        </h1>
        <p className="mt-2 text-black md:text-xl font-sans">
          Upload, catalog, and generate IIIF manifests for your digital collections
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-jstor-grey-light">
          <TabsTrigger
            value="create"
            className="data-[state=active]:bg-jstor-red data-[state=active]:text-white font-sans"
          >
            Create Manifest
          </TabsTrigger>
          <TabsTrigger
            value="view"
            className="data-[state=active]:bg-jstor-red data-[state=active]:text-white font-sans"
          >
            View Manifests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left column - File upload or preview */}
                <div className="space-y-6">{renderFileSection()}</div>

                {/* Right column - Metadata */}
                <div className="space-y-6">{renderMetadataSection()}</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="view" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-serif font-semibold">Your Manifests</h2>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadAllManifests}
                    disabled={isDownloadingAll || manifests.length === 0}
                    className="font-sans"
                  >
                    {isDownloadingAll ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Archive className="mr-2 h-4 w-4" />
                    )}
                    Download All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchManifests}
                    disabled={isLoading}
                    className="font-sans"
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                    Refresh
                  </Button>
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : manifests.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-serif font-medium mb-2">No manifests yet</h3>
                  <p className="text-muted-foreground mb-4 font-sans">
                    Create your first IIIF manifest by uploading files and adding metadata.
                  </p>
                  <Button
                    onClick={() => setActiveTab("create")}
                    className="bg-jstor-red hover:bg-jstor-red/90 text-white font-sans"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Manifest
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {manifests.map((manifest) => (
                      <ManifestCard
                        key={manifest.id}
                        manifest={manifest}
                        isActive={activeManifest === manifest.id}
                        onClick={() => setActiveManifest(manifest.id)}
                        onView={(e) => {
                          e.stopPropagation()
                          window.open(`/api/manifests/iiif/${manifest.id}`, "_blank")
                        }}
                        onDownload={(e) => {
                          e.stopPropagation()
                          downloadManifest(manifest)
                        }}
                        onThumbnailClick={() => setFullscreenManifest(manifest.id)}
                        getManifestThumbnailUrl={getManifestThumbnailUrl}
                      />
                    ))}
                  </div>

                  {activeManifest && (
                    <div className="mt-8 border-t pt-6">
                      <h3 className="text-lg font-serif font-medium mb-4">Preview</h3>
                      <BasicIIIFViewer manifestId={activeManifest} />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Fullscreen viewer */}
      {fullscreenManifest && (
        <FullscreenIIIFViewer manifestId={fullscreenManifest} onClose={() => setFullscreenManifest(null)} />
      )}
    </div>
  )
}
