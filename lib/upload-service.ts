// Helper function to compress images before upload
async function compressImage(file: File, maxWidth = 2000): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Skip compression for non-image files or small images
    if (!file.type.startsWith("image/") || file.size < 500000) {
      resolve(file)
      return
    }

    const img = new Image()
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let width = img.width
      let height = img.height

      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height

      // Draw and compress the image
      ctx?.drawImage(img, 0, 0, width, height)

      // Convert to blob with reduced quality for JPEGs
      const quality = file.type === "image/jpeg" ? 0.8 : 0.9
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error("Failed to compress image"))
          }
        },
        file.type,
        quality,
      )
    }

    img.onerror = () => reject(new Error("Failed to load image for compression"))

    // Load the image from the file
    img.src = URL.createObjectURL(file)
  })
}

export async function uploadToSupabase(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<{ fileId: string; filePath: string }> {
  try {
    // Report initial progress
    onProgress?.(10)

    // Compress image if it's an image file
    let fileToUpload: File | Blob = file
    if (file.type.startsWith("image/")) {
      try {
        const compressedBlob = await compressImage(file)
        fileToUpload = new File([compressedBlob], file.name, { type: file.type })
        onProgress?.(30)
      } catch (error) {
        console.warn("Image compression failed, using original file:", error)
        // Continue with the original file if compression fails
      }
    }

    onProgress?.(40)

    // Create a FormData object to send the file
    const formData = new FormData()
    formData.append("file", fileToUpload)

    // Upload via our server-side API route
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Upload failed")
    }

    onProgress?.(80)

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || "Upload failed")
    }

    onProgress?.(100)

    // Return the file ID and file path
    return {
      fileId: result.fileId,
      filePath: result.filePath,
    }
  } catch (error) {
    console.error("Error uploading file:", error)
    throw error
  }
}
