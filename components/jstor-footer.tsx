import Link from "next/link"

export function JstorFooter() {
  return (
    <footer className="bg-black text-white mt-12">
      <div className="container mx-auto py-8 px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-serif font-bold mb-4 text-white">IIIF Manifest Generator</h3>
            <p className="text-gray-300 font-sans">A tool for creating IIIF manifests from your digital collections.</p>
          </div>
          <div>
            <h4 className="text-lg font-serif font-semibold mb-4 text-white">Resources</h4>
            <ul className="space-y-2 font-sans">
              <li>
                <Link href="https://iiif.io/" className="text-gray-300 hover:text-jstor-blue-glacier transition-colors">
                  IIIF Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="https://jstor.org/"
                  className="text-gray-300 hover:text-jstor-blue-glacier transition-colors"
                >
                  JSTOR
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-300 hover:text-jstor-blue-glacier transition-colors">
                  User Guide
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-serif font-semibold mb-4 text-white">Contact</h4>
            <p className="text-gray-300 font-sans">
              For support or questions about the IIIF Manifest Generator, please contact us.
            </p>
            <Link
              href="mailto:support@example.com"
              className="inline-block mt-2 text-jstor-blue-glacier hover:underline font-sans"
            >
              support@example.com
            </Link>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-sm text-gray-300 font-sans">
          <p>© {new Date().getFullYear()} JSTOR. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
