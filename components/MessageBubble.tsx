/**
 * Message Bubble Component
 * Displays individual chat messages with markdown rendering
 */

'use client'

import { MessageBubbleProps } from '@/lib/types'
import MarkdownRenderer from './MarkdownRenderer'

export default function MessageBubble({ role, content, sources, timestamp }: MessageBubbleProps) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[85%] rounded-lg px-6 py-4 shadow-md ${
        isUser
          ? 'bg-luxury-navy-500 text-white'
          : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
      }`}>
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
        ) : (
          <MarkdownRenderer content={content} sources={sources} />
        )}

        {/* Timestamp */}
        {timestamp && (
          <div className={`text-xs mt-3 pt-2 border-t ${
            isUser 
              ? 'text-white/70 border-white/20' 
              : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
          }`}>
            {new Date(timestamp).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        )}
      </div>
    </div>
  )
}
