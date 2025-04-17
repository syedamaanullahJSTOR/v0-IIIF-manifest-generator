import Link from "next/link"
import Image from "next/image"

export function JstorHeader() {
  return (
    <header className="bg-black text-white">
      <div className="container mx-auto py-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link href="/" className="flex items-center">
              <Image
                src="/images/jstor-logo-white.png"
                alt="JSTOR Logo"
                width={180}
                height={75}
                className="h-14 w-auto"
              />
            </Link>
          </div>
          <nav className="hidden md:flex space-x-6">
            <Link href="#" className="text-white hover:text-gray-300 transition-colors">
              Home
            </Link>
            <Link href="#" className="text-white hover:text-gray-300 transition-colors">
              About
            </Link>
            <Link href="#" className="text-white hover:text-gray-300 transition-colors">
              Documentation
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
