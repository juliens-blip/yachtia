/**
 * Document Download Component
 * Requests a signed URL for a stored PDF.
 */

'use client'

import { useState } from 'react'

export default function DocumentDownload() {
  const [documentId, setDocumentId] = useState('')
  const [expiry, setExpiry] = useState(600)
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRequest = async () => {
    if (!documentId.trim()) {
      setError('Veuillez fournir un documentId valide.')
      return
    }

    setLoading(true)
    setError(null)
    setUrl(null)

    try {
      const response = await fetch('/api/document-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: documentId.trim(),
          expiresInSeconds: expiry
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate URL')
      }

      setUrl(data.url)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-serif font-bold text-luxury-navy-900 mb-4">
        Télécharger un PDF
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Générez un lien signé temporaire pour télécharger un document stocké.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document ID
          </label>
          <input
            type="text"
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
            placeholder="UUID du document"
            className="block w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-luxury-navy-500"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Expiration (secondes)
          </label>
          <input
            type="number"
            min={60}
            max={3600}
            value={expiry}
            onChange={(e) => setExpiry(parseInt(e.target.value || '600', 10))}
            className="block w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-luxury-navy-500"
            disabled={loading}
          />
        </div>

        <button
          onClick={handleRequest}
          disabled={loading || !documentId.trim()}
          className="w-full bg-luxury-navy-500 text-white px-6 py-3 rounded font-semibold hover:bg-luxury-navy-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Génération...' : 'Générer le lien'}
        </button>

        {url && (
          <div className="mt-4 p-4 rounded bg-green-50 border-l-4 border-green-500">
            <p className="font-semibold text-green-800">Lien prêt</p>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-green-700 underline break-all"
            >
              {url}
            </a>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 rounded bg-red-50 border-l-4 border-red-500">
            <p className="text-red-800">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
