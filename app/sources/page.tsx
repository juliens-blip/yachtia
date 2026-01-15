/**
 * Sources Page - Display all available documents
 */

import Navbar from '@/components/Navbar'
import SourcesPanel from '@/components/SourcesPanel'

export default function SourcesPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-gray-900 dark:text-white mb-2">
            📚 Base Documentaire
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Explorez toutes les sources juridiques disponibles pour l&apos;assistant IA
          </p>
        </div>

        <SourcesPanel />
      </main>
    </div>
  )
}
