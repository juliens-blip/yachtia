/**
 * Chat Page - Main chat interface
 */

import Navbar from '@/components/Navbar'
import ChatInterface from '@/components/ChatInterface'
import LegalDisclaimer from '@/components/LegalDisclaimer'
import ConsentBanner from '@/components/ConsentBanner'

export const metadata = {
  title: 'Chat - Yacht Legal AI',
  description: 'Posez vos questions juridiques en droit maritime'
}

export default function ChatPage() {
  return (
    <div className="flex flex-col h-screen">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col overflow-hidden">
        <LegalDisclaimer />

        <div className="flex-1 bg-white rounded-lg shadow-lg overflow-hidden min-h-0">
          <ChatInterface />
        </div>
      </main>

      <ConsentBanner />
    </div>
  )
}
