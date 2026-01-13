/**
 * Document Uploader Component
 * Upload PDF documents with category selection
 */

'use client'

import { useState } from 'react'

type UploadResult = {
  documentId: string
  chunksCount: number
  pages: number
}

const CATEGORIES = [
  { value: 'MYBA', label: 'MYBA - Mediterranean Yacht Brokers Association' },
  { value: 'AML', label: 'AML - Anti-Money Laundering' },
  { value: 'MLC', label: 'MLC - Maritime Labor Convention 2006' },
  { value: 'PAVILION', label: 'PAVILION - Flag Administration' },
  { value: 'INSURANCE', label: 'INSURANCE - Insurance & Liability' },
  { value: 'CREW', label: 'CREW - Crew Management' },
  { value: 'REGISTRATION', label: 'REGISTRATION - Vessel Registration' },
  { value: 'ENVIRONMENTAL', label: 'ENVIRONMENTAL - Environmental Regulations' },
  { value: 'CORPORATE', label: 'CORPORATE - Corporate Structures' },
  { value: 'CHARTER', label: 'CHARTER - Charter Agreements' }
]

export default function DocumentUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      if (selectedFile.type !== 'application/pdf') {
        setError('Seuls les fichiers PDF sont acceptés.')
        setFile(null)
        return
      }

      // Validate file size (10MB)
      const maxSize = 10 * 1024 * 1024
      if (selectedFile.size > maxSize) {
        setError('Le fichier est trop volumineux (max 10MB).')
        setFile(null)
        return
      }

      setFile(selectedFile)
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!file || !category) {
      setError('Veuillez sélectionner un fichier PDF et une catégorie.')
      return
    }

    setUploading(true)
    setResult(null)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', category)
      if (sourceUrl) formData.append('sourceUrl', sourceUrl)

      const response = await fetch('/api/upload-doc', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setResult(data)

      // Reset form
      setFile(null)
      setCategory('')
      setSourceUrl('')

      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''

    } catch (error: unknown) {
      console.error('Upload error:', error)
      const message = error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'upload.'
      setError(message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-serif font-bold text-luxury-navy-900 mb-6">
        Télécharger un Document Juridique
      </h2>

      <div className="space-y-4">
        {/* File Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fichier PDF *
          </label>
          <input
            id="file-input"
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-luxury-navy-500 file:text-white hover:file:bg-luxury-navy-600 file:cursor-pointer cursor-pointer"
            disabled={uploading}
          />
          {file && (
            <p className="mt-2 text-sm text-gray-600">
              Fichier sélectionné: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        {/* Category Select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Catégorie Juridique *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="block w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-luxury-navy-500"
            disabled={uploading}
          >
            <option value="">Sélectionnez une catégorie...</option>
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Source URL (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            URL Source (optionnel)
          </label>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://..."
            className="block w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-luxury-navy-500"
            disabled={uploading}
          />
        </div>

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={uploading || !file || !category}
          className="w-full bg-luxury-gold-500 text-luxury-navy-900 px-6 py-3 rounded font-semibold hover:bg-luxury-gold-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {uploading ? 'Téléchargement en cours...' : 'Télécharger le Document'}
        </button>

        {/* Result/Error Messages */}
        {result && (
          <div className="mt-4 p-4 rounded bg-green-50 border-l-4 border-green-500">
            <p className="font-semibold text-green-800">Document téléchargé avec succès !</p>
            <p className="text-sm text-green-700 mt-1">
              {result.chunksCount} chunks indexés depuis {result.pages} pages
            </p>
            <p className="text-xs text-green-600 mt-2">
              ID du document: {result.documentId}
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 rounded bg-red-50 border-l-4 border-red-500">
            <p className="text-red-800">{error}</p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 rounded">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Les documents uploadés sont automatiquement indexés
          pour la recherche sémantique. Le traitement peut prendre quelques secondes selon la taille du document.
        </p>
      </div>
    </div>
  )
}
