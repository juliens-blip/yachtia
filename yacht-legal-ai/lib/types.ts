/**
 * Shared TypeScript types for the application
 */

export type Source = {
  documentName?: string
  title?: string
  url?: string
  category: string
  similarity?: number
  pageNumber?: number | null
}

export type Message = {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  timestamp?: string
}

export type MessageBubbleProps = {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  timestamp?: string
}
