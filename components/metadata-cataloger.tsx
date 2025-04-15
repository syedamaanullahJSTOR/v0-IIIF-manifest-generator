"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Save } from "lucide-react"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabase } from "@/lib/supabase"

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

type MetadataCatalogerProps = {
  files: UploadedFile[]
  onComplete: (metadata: DublinCoreMetadata, fileIds: string[]) => void
  onCancel: () => void
}

export default function MetadataCataloger({ files, onComplete, onCancel }: MetadataCatalogerProps) {
  const [activeFileIndex, setActiveFileIndex] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
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
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({})
  const { toast } = useToast()

  // Get public URLs for files
  useEffect(() => {
    const getFileUrls = async () => {
      const urls: Record<string, string> = {}

      for (const file of files) {
        if (file.filePath) {
          const { data } = supabase.storage.from("iiif-images").getPublicUrl(file.filePath)

          urls[file.id] = data.publicUrl
        }
      }

      setFileUrls(urls)
    }

    getFileUrls()
  }, [files])

  const handleInputChange = (field: keyof DublinCoreMetadata, value: string) => {
    setMetadata((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSave = async () => {
    if (!metadata.title) {
      toast({
        title: "Title required",
        description: "Please provide at least a title for the item.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      // Get all file IDs
      const fileIds = files.map((file) => file.fileId).filter((id): id is string => !!id)

      // Complete the cataloging process
      onComplete(metadata, fileIds)
    } catch (error) {
      console.error("Error saving metadata:", error)
      toast({
        title: "Error",
        description: "Failed to save metadata.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const activeFile = files[activeFileIndex]
  const totalFiles = files.length

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left column - Metadata form */}
      <Card className="h-[calc(100vh-200px)] flex flex-col">
        <CardContent className="flex flex-col h-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Catalog Item</h2>
            <div className="text-sm text-muted-foreground">
              Item {activeFileIndex + 1} of {totalFiles}
            </div>
          </div>

          <Tabs defaultValue="basic" className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="additional">Additional</TabsTrigger>
              <TabsTrigger value="rights">Rights</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              <TabsContent value="basic" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={metadata.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="Title of the item"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="creator">Creator</Label>
                  <Input
                    id="creator"
                    value={metadata.creator}
                    onChange={(e) => handleInputChange("creator", e.target.value)}
                    placeholder="Creator of the item"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={metadata.subject}
                    onChange={(e) => handleInputChange("subject", e.target.value)}
                    placeholder="Subject keywords"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={metadata.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Description of the item"
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    value={metadata.date}
                    onChange={(e) => handleInputChange("date", e.target.value)}
                    placeholder="Date associated with the item"
                  />
                </div>
              </TabsContent>

              <TabsContent value="additional" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="publisher">Publisher</Label>
                  <Input
                    id="publisher"
                    value={metadata.publisher}
                    onChange={(e) => handleInputChange("publisher", e.target.value)}
                    placeholder="Publisher of the item"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contributor">Contributor</Label>
                  <Input
                    id="contributor"
                    value={metadata.contributor}
                    onChange={(e) => handleInputChange("contributor", e.target.value)}
                    placeholder="Contributor to the item"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Input
                    id="type"
                    value={metadata.type}
                    onChange={(e) => handleInputChange("type", e.target.value)}
                    placeholder="Type of resource"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="format">Format</Label>
                  <Input
                    id="format"
                    value={metadata.format}
                    onChange={(e) => handleInputChange("format", e.target.value)}
                    placeholder="File format or physical medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="identifier">Identifier</Label>
                  <Input
                    id="identifier"
                    value={metadata.identifier}
                    onChange={(e) => handleInputChange("identifier", e.target.value)}
                    placeholder="Unique identifier for the item"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source">Source</Label>
                  <Input
                    id="source"
                    value={metadata.source}
                    onChange={(e) => handleInputChange("source", e.target.value)}
                    placeholder="Source of the item"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Input
                    id="language"
                    value={metadata.language}
                    onChange={(e) => handleInputChange("language", e.target.value)}
                    placeholder="Language of the item"
                  />
                </div>
              </TabsContent>

              <TabsContent value="rights" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="relation">Relation</Label>
                  <Input
                    id="relation"
                    value={metadata.relation}
                    onChange={(e) => handleInputChange("relation", e.target.value)}
                    placeholder="Related resource"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coverage">Coverage</Label>
                  <Input
                    id="coverage"
                    value={metadata.coverage}
                    onChange={(e) => handleInputChange("coverage", e.target.value)}
                    placeholder="Spatial or temporal coverage"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rights">Rights</Label>
                  <Textarea
                    id="rights"
                    value={metadata.rights}
                    onChange={(e) => handleInputChange("rights", e.target.value)}
                    placeholder="Rights information"
                    rows={4}
                  />
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <div className="flex justify-between mt-6 pt-4 border-t">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <div className="flex gap-2">
              {totalFiles > 1 && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setActiveFileIndex((prev) => Math.max(0, prev - 1))}
                    disabled={activeFileIndex === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveFileIndex((prev) => Math.min(totalFiles - 1, prev + 1))}
                    disabled={activeFileIndex === totalFiles - 1}
                  >
                    Next
                  </Button>
                </>
              )}
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save & Continue
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Right column - Image preview */}
      <Card className="h-[calc(100vh-200px)] flex flex-col">
        <CardContent className="flex flex-col h-full p-6">
          <h2 className="text-2xl font-bold mb-4">Preview</h2>
          <div className="flex-1 flex items-center justify-center bg-muted rounded-md overflow-hidden">
            {activeFile.type === "image" ? (
              fileUrls[activeFile.id] ? (
                <div className="relative w-full h-full">
                  <Image
                    src={fileUrls[activeFile.id] || "/placeholder.svg"}
                    alt={metadata.title || activeFile.file.name}
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-background p-4 rounded-md mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-muted-foreground"
                  >
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium">{activeFile.file.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">Document preview not available</p>
              </div>
            )}
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              {activeFile.file.name} ({(activeFile.file.size / 1024).toFixed(1)} KB)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
