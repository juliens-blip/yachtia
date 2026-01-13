/**
 * Landing Page - Yacht Legal AI Assistant
 */

import Link from 'next/link'
import Navbar from '@/components/Navbar'
import ConsentBanner from '@/components/ConsentBanner'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-luxury-navy-900 via-luxury-navy-600 to-luxury-navy-900">
      <Navbar />

      <main className="container mx-auto px-4 py-20">
        <div className="text-center text-white">
          <h1 className="text-6xl font-serif font-bold mb-6 text-luxury-gold-500">
            Yacht Legal AI Assistant
          </h1>
          <p className="text-xl mb-12 max-w-3xl mx-auto leading-relaxed">
            Assistant juridique intelligent spécialisé en droit maritime pour brokers de yachts.
            Obtenez des réponses instantanées sur MYBA, AML, MLC, pavillons et plus encore.
          </p>

          <div className="flex justify-center gap-6 mb-16">
            <Link
              href="/chat"
              className="bg-luxury-gold-500 text-luxury-navy-900 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-luxury-gold-600 transition shadow-lg"
            >
              Commencer à Chatter
            </Link>
            <Link
              href="/documents"
              className="bg-white/10 backdrop-blur text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white/20 transition border border-white/30"
            >
              Parcourir Documents
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white/10 backdrop-blur rounded-lg p-6 text-white border border-white/20">
            <h3 className="text-xl font-bold mb-3 text-luxury-gold-500">🤖 RAG-Powered</h3>
            <p className="text-sm leading-relaxed">
              Retrieval-Augmented Generation pour des réponses précises basées sur vos documents juridiques officiels
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-lg p-6 text-white border border-white/20">
            <h3 className="text-xl font-bold mb-3 text-luxury-gold-500">🔒 RGPD Compliant</h3>
            <p className="text-sm leading-relaxed">
              Conformité totale RGPD avec audit logs, disclaimers légaux et droit à l&apos;oubli intégré
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-lg p-6 text-white border border-white/20">
            <h3 className="text-xl font-bold mb-3 text-luxury-gold-500">⚡ Gemini AI</h3>
            <p className="text-sm leading-relaxed">
              Propulsé par Gemini 1.5 Flash pour des réponses juridiques intelligentes et contextuelles en temps réel
            </p>
          </div>
        </div>

        {/* Categories */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-serif font-bold text-luxury-gold-500 mb-8">
            Catégories Juridiques Couvertes
          </h2>
          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {['MYBA', 'AML', 'MLC', 'PAVILION', 'INSURANCE', 'CREW', 'REGISTRATION', 'ENVIRONMENTAL', 'CORPORATE', 'CHARTER'].map(cat => (
              <span key={cat} className="bg-luxury-gold-500/20 text-luxury-gold-500 px-4 py-2 rounded-full text-sm font-semibold border border-luxury-gold-500/30">
                {cat}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-20 text-center text-white/60 text-sm">
          <p>Yacht Legal AI Assistant v1.0 Beta</p>
          <p className="mt-2">Powered by Next.js 14 + Supabase + Gemini 1.5 Flash</p>
        </div>
      </main>

      <ConsentBanner />
    </div>
  )
}
