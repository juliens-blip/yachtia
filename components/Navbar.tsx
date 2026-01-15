/**
 * Navigation Bar Component
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <nav className="bg-luxury-navy-900 text-white border-b border-luxury-gold-500/30">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="text-2xl font-serif font-bold text-luxury-gold-500 hover:text-luxury-gold-600 transition">
            Yacht Legal AI
          </Link>

          {/* Navigation Links */}
          <div className="flex gap-6 items-center">
            <Link
              href="/chat"
              className={`hover:text-luxury-gold-500 transition ${isActive('/chat') ? 'text-luxury-gold-500 font-semibold' : ''}`}
            >
              💬 Chat
            </Link>
            <Link
              href="/sources"
              className={`hover:text-luxury-gold-500 transition ${isActive('/sources') ? 'text-luxury-gold-500 font-semibold' : ''}`}
            >
              📚 Sources
            </Link>
            <Link
              href="/documents"
              className={`hover:text-luxury-gold-500 transition ${isActive('/documents') ? 'text-luxury-gold-500 font-semibold' : ''}`}
            >
              📄 Documents
            </Link>
            <div className="text-sm opacity-75">
              Beta v1.0
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
