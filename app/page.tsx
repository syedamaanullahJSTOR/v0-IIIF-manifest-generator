import type { Metadata } from "next"
import ManifestGenerator from "@/components/manifest-generator"
import { JstorHeader } from "@/components/jstor-header"
import { JstorFooter } from "@/components/jstor-footer"

export const metadata: Metadata = {
  title: "IIIF Manifest Generator",
  description: "Upload images and documents to generate IIIF manifests",
}

export default function Home() {
  return (
    <>
      <JstorHeader />
      <main className="container mx-auto py-6 px-4">
        <ManifestGenerator />
      </main>
      <JstorFooter />
    </>
  )
}
