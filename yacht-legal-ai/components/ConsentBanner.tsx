/**
 * RGPD Consent Banner Component
 * Shows on first visit to collect user consent for cookies and data processing
 */

'use client'

import { useState, useEffect } from 'react'

export default function ConsentBanner() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('yacht-legal-consent')
    if (!consent) {
      setShowBanner(true)
    }
  }, [])

  const handleAccept = async () => {
    localStorage.setItem('yacht-legal-consent', 'accepted')
    setShowBanner(false)

    // Log consent (audit trail)
    try {
      await fetch('/api/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'consent',
          metadata: { accepted: true, timestamp: new Date().toISOString() }
        })
      })
    } catch (error) {
      console.error('Failed to log consent:', error)
    }
  }

  const handleDecline = () => {
    localStorage.setItem('yacht-legal-consent', 'declined')
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 inset-x-0 bg-luxury-navy-900 text-white p-6 shadow-2xl z-50 border-t-2 border-luxury-gold-500">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex-1">
            <h3 className="font-semibold mb-2">Cookies et Protection des Données (RGPD)</h3>
            <p className="text-sm opacity-90">
              Nous utilisons des cookies et stockons vos conversations pour améliorer votre expérience.
              En continuant, vous acceptez notre politique de confidentialité conforme au RGPD.
              Vous pouvez exercer votre droit à l&apos;oubli à tout moment.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleDecline}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded transition"
            >
              Refuser
            </button>
            <button
              onClick={handleAccept}
              className="px-6 py-2 bg-luxury-gold-500 text-luxury-navy-900 font-semibold rounded hover:bg-luxury-gold-600 transition"
            >
              Accepter
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
