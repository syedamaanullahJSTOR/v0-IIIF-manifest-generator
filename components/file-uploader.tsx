"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, X, FileText, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import { uploadToSupabase } from "@/lib/upload-service"
import { Progress } from "@/components/ui/progress"

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
}

export default function FileUploader({ onFilesUploaded }: { onFilesUploaded: (files: UploadedFile[]) => void }) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadQueue, setUploadQueue] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Initialize storage bucket on component mount
  useEffect(() => {
    fetch("/api/init-storage")
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          console.error("Failed to initialize storage:", data.error)
        }
      })
      .catch((err) => {
        console.error("Error initializing storage:", err)
      })
  }, [])

  // Process upload queue
  useEffect(() => {
    const processNextInQueue = async () => {
      if (uploadQueue.length === 0 || isUploading) return

      setIsUploading(true)
      const fileId = uploadQueue[0]

      try {
        const fileIndex = files.findIndex((f) => f.id === fileId)
        if (fileIndex === -1) {
          // File was removed from the list
          setUploadQueue((prev) => prev.slice(1))
          setIsUploading(false)
          return
        }

        const file = files[fileIndex]

        // Update file status to uploading
        setFiles((prev) => {
          const updated = [...prev]
          updated[fileIndex] = { ...file, status: "uploading", progress: 0 }
          return updated
        })

        // Upload the file with progress tracking
        const { fileId: newFileId, filePath } = await uploadToSupabase(file.file, (progress) => {
          setFiles((prev) => {
            const updatedFiles = [...prev]
            const currentIndex = updatedFiles.findIndex((f) => f.id === fileId)
            if (currentIndex !== -1) {
              updatedFiles[currentIndex] = {
                ...updatedFiles[currentIndex],
                progress,
              }
            }
            return updatedFiles
          })
        })

        // Update file with success info
        setFiles((prev) => {
          const updated = [...prev]
          const currentIndex = updated.findIndex((f) => f.id === fileId)
          if (currentIndex !== -1) {
            updated[currentIndex] = {
              ...updated[currentIndex],
              fileId: newFileId,
              filePath,
              status: "uploaded",
              progress: 100,
            }
          }
          return updated
        })

        // Notify parent of successful upload
        const successFile = {
          ...file,
          fileId: newFileId,
          filePath,
          status: "uploaded",
          progress: 100,
        }

        onFilesUploaded([successFile])
      } catch (error) {
        console.error(`Error uploading file:`, error)

        // Update file with error info
        setFiles((prev) => {
          const updated = [...prev]
          const fileIndex = updated.findIndex((f) => f.id === fileId)
          if (fileIndex !== -1) {
            updated[fileIndex] = {
              ...updated[fileIndex],
              status: "error",
              progress: 0,
              error: error instanceof Error ? error.message : "Unknown error",
            }
          }
          return updated
        })

        toast({
          title: "Upload failed",
          description: `Failed to upload file. ${error instanceof Error ? error.message : ""}`,
          variant: "destructive",
        })
      } finally {
        // Remove from queue and process next
        setUploadQueue((prev) => prev.slice(1))
        setIsUploading(false)
      }
    }

    processNextInQueue()
  }, [uploadQueue, isUploading, files, onFilesUploaded, toast])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    addFiles(selectedFiles)

    // Reset the input value so the same file can be uploaded again if removed
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const addFiles = (selectedFiles: FileList) => {
    const newFiles: UploadedFile[] = []

    Array.from(selectedFiles).forEach((file) => {
      // Check if file is already in the list
      if (files.some((f) => f.file.name === file.name && f.file.size === file.size)) {
        toast({
          title: "File already added",
          description: `${file.name} is already in your list.`,
          variant: "destructive",
        })
        return
      }

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

    if (newFiles.length > 0) {
      toast({
        title: "Files added",
        description: `${newFiles.length} file(s) added successfully.`,
      })
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === id)
      if (fileToRemove && fileToRemove.type === "image") {
        URL.revokeObjectURL(fileToRemove.preview)
      }

      // Also remove from upload queue if pending
      if (fileToRemove?.status === "pending") {
        setUploadQueue((prev) => prev.filter((queuedId) => queuedId !== id))
      }

      return prev.filter((f) => f.id !== id)
    })
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const processFiles = async () => {
    if (files.length === 0) return

    // Get all pending files
    const pendingFiles = files.filter((file) => file.status === "pending")

    if (pendingFiles.length === 0) {
      toast({
        title: "No files to process",
        description: "All files have already been processed.",
      })
      return
    }

    // Add pending files to the upload queue
    const pendingIds = pendingFiles.map((file) => file.id)
    setUploadQueue((prev) => [...prev, ...pendingIds])

    toast({
      title: "Processing started",
      description: `Started processing ${pendingFiles.length} file(s).`,
    })
  }

  const retryUpload = (id: string) => {
    setFiles((prev) => {
      const updated = [...prev]
      const fileIndex = updated.findIndex((f) => f.id === id)
      if (fileIndex !== -1) {
        updated[fileIndex] = {
          ...updated[fileIndex],
          status: "pending",
          progress: 0,
          error: undefined,
        }
      }
      return updated
    })

    // Add to upload queue
    setUploadQueue((prev) => [...prev, id])
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Files</CardTitle>
        <CardDescription>Upload single or multiple images or documents to generate IIIF manifests</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors",
            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleUploadClick}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
          />
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <h3 className="font-medium text-lg">Drag & drop files here</h3>
            <p className="text-sm text-muted-foreground">or click to browse (supports images, PDF, DOC, DOCX)</p>
          </div>
        </div>

        {files.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {files.map((file) => (
              <div key={file.id} className="relative group border rounded-lg overflow-hidden">
                <div className="aspect-square flex items-center justify-center bg-muted p-2">
                  {file.type === "image" ? (
                    <Image
                      src={file.preview || "/placeholder.svg"}
                      alt={file.file.name}
                      fill
                      className="object-contain p-2"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <FileText className="h-12 w-12 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground mt-2 text-center px-2 truncate max-w-full">
                        {file.file.name}
                      </span>
                    </div>
                  )}

                  {file.status === "uploading" && (
                    <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center p-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                      <span className="text-sm font-medium mb-2">Uploading...</span>
                      <Progress value={file.progress} className="w-full h-2" />
                      <span className="text-xs text-muted-foreground mt-1">{file.progress}%</span>
                    </div>
                  )}

                  {file.status === "uploaded" && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      Uploaded
                    </div>
                  )}

                  {file.status === "error" && (
                    <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center p-4">
                      <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                      <span className="text-sm font-medium text-destructive mb-1">Upload Failed</span>
                      <p className="text-xs text-muted-foreground text-center mb-2">
                        {file.error || "An error occurred during upload"}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          retryUpload(file.id)
                        }}
                      >
                        Retry Upload
                      </Button>
                    </div>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(file.id)
                  }}
                  disabled={file.status === "uploading"}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="p-2 text-sm truncate">
                  {file.file.name.length > 20 ? `${file.file.name.substring(0, 20)}...` : file.file.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          {files.length} file{files.length !== 1 ? "s" : ""} selected
          {files.length > 0 && (
            <span className="ml-2">
              ({files.filter((f) => f.status === "uploaded").length} uploaded,
              {files.filter((f) => f.status === "error").length} failed)
            </span>
          )}
        </div>
        <Button disabled={files.length === 0 || files.every((f) => f.status !== "pending")} onClick={processFiles}>
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Process Files"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
