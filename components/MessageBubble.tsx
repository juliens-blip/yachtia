/**
 * Message Bubble Component
 * Displays individual chat messages from user or assistant
 */

import { MessageBubbleProps } from '@/lib/types'

export default function MessageBubble({ role, content, sources, timestamp }: MessageBubbleProps) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-3xl rounded-lg px-6 py-4 shadow-md ${
        isUser
          ? 'bg-luxury-navy-500 text-white'
          : 'bg-gray-100 text-gray-900'
      }`}>
        {/* Message Content */}
        <p className="whitespace-pre-wrap leading-relaxed">{content}</p>

        {/* Sources (only for assistant messages) */}
        {sources && sources.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-300">
            <p className="text-xs font-semibold mb-2 opacity-75">Sources utilisées:</p>
            <div className="space-y-1">
              {sources.map((source, i) => (
                <div key={i} className="text-xs opacity-75">
                  <span className="font-medium">{source.documentName}</span>
                  {' '}
                  <span className="text-luxury-gold-600 font-semibold">({source.category})</span>
                  {source.pageNumber && ` - Page ${source.pageNumber}`}
                  {' • '}
                  <span className="text-green-600">{source.similarity}% pertinent</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timestamp */}
        {timestamp && (
          <div className="mt-2 text-xs opacity-50">
            {new Date(timestamp).toLocaleTimeString('fr-FR')}
          </div>
        )}
      </div>
    </div>
  )
}
