/**
 * Chat Interface Component
 * Main chat UI with message history and input
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import MessageBubble from './MessageBubble'

type Source = {
  documentName: string
  category: string
  similarity: number
  pageNumber?: number | null
}

type Message = {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  timestamp?: string
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setError(null)

    // Add user message immediately
    const newMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, newMessage])
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Request failed')
      }

      const data = await response.json()

      // Set conversation ID if new
      if (!conversationId && data.conversationId) {
        setConversationId(data.conversationId)
      }

      // Add assistant response
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, assistantMessage])

    } catch (error: unknown) {
      console.error('Chat error:', error)
      const message = error instanceof Error ? error.message : 'Une erreur est survenue'
      setError(message)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Désolé, une erreur est survenue. Veuillez réessayer.',
        timestamp: new Date().toISOString()
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-20">
            <p className="text-lg font-semibold mb-2">Bienvenue sur Yacht Legal AI</p>
            <p className="text-sm">Posez votre question juridique en droit maritime...</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} {...msg} />
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-6 py-4 shadow-md">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 my-2">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Posez votre question juridique... (Ex: Quels sont les requirements AML?)"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-luxury-navy-500 resize-none"
            disabled={loading}
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-luxury-navy-500 text-white px-8 py-3 rounded-lg hover:bg-luxury-navy-600 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold"
          >
            {loading ? 'Envoi...' : 'Envoyer'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Appuyez sur Entrée pour envoyer, Maj+Entrée pour nouvelle ligne
        </p>
      </div>
    </div>
  )
}
