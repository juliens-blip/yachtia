/**
 * Sources Panel Component
 * Displays all documents in the database grouped by category
 */

'use client'

import { useState, useEffect } from 'react'

interface Document {
  id: string
  name: string
  category: string
  pages: number | null
  source_url: string | null
  file_url: string | null
  created_at: string
}

interface SourcesData {
  documents: Record<string, Document[]>
  stats: {
    totalDocuments: number
    totalCategories: number
    byCategory: Record<string, number>
  }
}

const CATEGORY_ICONS: Record<string, string> = {
  MYBA: '📋',
  YET: '💶',
  AML_KYC: '🔍',
  MLC_2006: '👥',
  MANNING_STCW: '⚓',
  PAVILLONS: '🚩',
  PAVILLON_FRANCE: '🇫🇷',
  PAVILLON_MALTA: '🇲🇹',
  PAVILLON_CAYMAN_REG: '🇰🇾',
  PAVILLON_MARSHALL: '🇲🇭',
  PAVILLON_BVI: '🇻🇬',
  PAVILLON_IOM: '🇮🇲',
  PAVILLON_MADERE: '🇵🇹',
  DROIT_SOCIAL: '⚖️',
  DROIT_MER_INTERNATIONAL: '🌊',
  GUIDES_PAVILLONS: '📊',
  IA_RGPD: '🤖'
}

const CATEGORY_LABELS: Record<string, string> = {
  MYBA: 'MYBA (Contrats Charter)',
  YET: 'YET (Régime Fiscal)',
  AML_KYC: 'AML/KYC (Conformité)',
  MLC_2006: 'MLC 2006 (Convention Équipage)',
  MANNING_STCW: 'Manning & STCW (Certifications)',
  PAVILLONS: 'Pavillons (Registres Généraux)',
  PAVILLON_FRANCE: 'Pavillon France (RIF)',
  PAVILLON_MALTA: 'Pavillon Malta',
  PAVILLON_CAYMAN_REG: 'Pavillon Îles Caïmans (Red Ensign)',
  PAVILLON_MARSHALL: 'Pavillon Îles Marshall (RMI)',
  PAVILLON_BVI: 'Pavillon British Virgin Islands',
  PAVILLON_IOM: 'Pavillon Isle of Man',
  PAVILLON_MADERE: 'Pavillon Madère (MAR)',
  DROIT_SOCIAL: 'Droit Social Maritime',
  DROIT_MER_INTERNATIONAL: 'Droit International de la Mer',
  GUIDES_PAVILLONS: 'Guides Comparatifs Pavillons',
  IA_RGPD: 'IA & RGPD (Disclaimers)'
}

export default function SourcesPanel() {
  const [data, setData] = useState<SourcesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchSources()
  }, [])

  const fetchSources = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/sources')
      if (!response.ok) throw new Error('Failed to fetch sources')
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const filteredCategories = data ? Object.entries(data.documents).filter(([category, docs]) => {
    if (selectedCategory && category !== selectedCategory) return false
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return docs.some(doc => 
        doc.name.toLowerCase().includes(term) ||
        category.toLowerCase().includes(term)
      )
    }
    return true
  }) : []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-luxury-navy-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement des sources...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <p className="text-red-600 dark:text-red-400">❌ Erreur: {error}</p>
        <button
          onClick={fetchSources}
          className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800"
        >
          Réessayer
        </button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-gray-200 dark:border-gray-700">
          <div className="text-3xl font-bold text-luxury-navy-500">{data.stats.totalDocuments}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Documents Totaux</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-gray-200 dark:border-gray-700">
          <div className="text-3xl font-bold text-luxury-navy-500">{data.stats.totalCategories}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Catégories</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-gray-200 dark:border-gray-700">
          <div className="text-3xl font-bold text-luxury-navy-500">
            {Object.values(data.stats.byCategory).reduce((a, b) => a + b, 0)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Sources Disponibles</div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="🔍 Rechercher une source..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-luxury-navy-500"
        />
        <select
          value={selectedCategory || ''}
          onChange={(e) => setSelectedCategory(e.target.value || null)}
          className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-luxury-navy-500"
        >
          <option value="">Toutes les catégories</option>
          {Object.keys(data.documents).sort().map(cat => (
            <option key={cat} value={cat}>
              {CATEGORY_ICONS[cat] || '📄'} {CATEGORY_LABELS[cat] || cat} ({data.stats.byCategory[cat]})
            </option>
          ))}
        </select>
      </div>

      {/* Sources List */}
      <div className="space-y-6">
        {filteredCategories.map(([category, docs]) => (
          <div key={category} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-luxury-navy-500 to-luxury-navy-600 px-6 py-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="text-2xl">{CATEGORY_ICONS[category] || '📄'}</span>
                <span>{CATEGORY_LABELS[category] || category}</span>
                <span className="ml-auto text-sm bg-white/20 px-3 py-1 rounded-full">
                  {docs.length} doc{docs.length > 1 ? 's' : ''}
                </span>
              </h3>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {docs
                .filter(doc => {
                  if (!searchTerm) return true
                  return doc.name.toLowerCase().includes(searchTerm.toLowerCase())
                })
                .map(doc => (
                  <div key={doc.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                          {doc.name}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          {doc.pages && (
                            <span className="flex items-center gap-1">
                              📄 {doc.pages} page{doc.pages > 1 ? 's' : ''}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            📅 {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.source_url && (
                          <a
                            href={doc.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-luxury-navy-500 text-white text-sm rounded hover:bg-luxury-navy-600 transition"
                          >
                            🔗 Voir Source
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Aucune source trouvée pour &quot;{searchTerm}&quot; dans {selectedCategory || 'toutes les catégories'}
        </div>
      )}
    </div>
  )
}
