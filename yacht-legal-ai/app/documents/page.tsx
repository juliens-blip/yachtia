/**
 * Documents Page - Upload and manage documents
 */

import Navbar from '@/components/Navbar'
import DocumentUploader from '@/components/DocumentUploader'
import DocumentDownload from '@/components/DocumentDownload'
import ConsentBanner from '@/components/ConsentBanner'

export const metadata = {
  title: 'Documents - Yacht Legal AI',
  description: 'Téléchargez et gérez vos documents juridiques maritimes'
}

export default function DocumentsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-luxury-navy-900 mb-2">
            Gestion des Documents
          </h1>
          <p className="text-gray-600">
            Téléchargez vos documents juridiques PDF pour les indexer dans la base de connaissance
          </p>
        </div>

        <DocumentUploader />

        <div className="mt-10">
          <DocumentDownload />
        </div>
      </main>

      <ConsentBanner />
    </div>
  )
}
