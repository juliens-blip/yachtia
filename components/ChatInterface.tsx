/**
 * Chat Interface Component
 * Main chat UI with message history and input
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import MessageBubble from './MessageBubble'
import { Message } from '@/lib/types'

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
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
            <div className="text-5xl mb-4">⚓</div>
            <p className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">
              Yacht Legal AI
            </p>
            <p className="text-sm">Posez votre question juridique en droit maritime...</p>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
              <button
                onClick={() => setInput("Quelles sont les obligations AML pour yacht brokers en France?")}
                className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition text-sm text-gray-700 dark:text-gray-300"
              >
                💼 Obligations AML pour yacht brokers
              </button>
              <button
                onClick={() => setInput("Explique-moi le MYBA Charter Agreement")}
                className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition text-sm text-gray-700 dark:text-gray-300"
              >
                📄 MYBA Charter Agreement
              </button>
              <button
                onClick={() => setInput("Qu'est-ce que le YET scheme?")}
                className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition text-sm text-gray-700 dark:text-gray-300"
              >
                🏴 YET Scheme
              </button>
              <button
                onClick={() => setInput("Droits de l'équipage selon MLC 2006?")}
                className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition text-sm text-gray-700 dark:text-gray-300"
              >
                👥 Droits MLC 2006
              </button>
            </div>
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
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Posez votre question juridique... (Ex: Quels sont les requirements AML?)"
            className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-luxury-navy-500 resize-none"
            disabled={loading}
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-luxury-navy-500 text-white px-8 py-3 rounded-lg hover:bg-luxury-navy-600 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold shadow-lg"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Envoi...
              </span>
            ) : (
              'Envoyer'
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Appuyez sur Entrée pour envoyer, Maj+Entrée pour nouvelle ligne
        </p>
      </div>
    </div>
  )
}
