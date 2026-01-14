/**
 * Markdown Renderer Component
 * Renders markdown with syntax highlighting and citations
 */

'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

import { Source } from '@/lib/types'

interface MarkdownRendererProps {
  content: string
  sources?: Source[]
}

export default function MarkdownRenderer({ content, sources }: MarkdownRendererProps) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode }) {
            const match = /language-(\w+)/.exec(className || '')
            return !inline && match ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                className="rounded-md"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm" {...props}>
                {children}
              </code>
            )
          },
          a({ href, children }: { href?: string; children?: React.ReactNode }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
              >
                {children}
              </a>
            )
          },
          p({ children }: { children?: React.ReactNode }) {
            return <p className="mb-4 leading-relaxed">{children}</p>
          },
          ul({ children }: { children?: React.ReactNode }) {
            return <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>
          },
          ol({ children }: { children?: React.ReactNode }) {
            return <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>
          },
          h1({ children }: { children?: React.ReactNode }) {
            return <h1 className="text-2xl font-bold mb-4 mt-6">{children}</h1>
          },
          h2({ children }: { children?: React.ReactNode }) {
            return <h2 className="text-xl font-semibold mb-3 mt-5">{children}</h2>
          },
          h3({ children }: { children?: React.ReactNode }) {
            return <h3 className="text-lg font-semibold mb-2 mt-4">{children}</h3>
          },
          blockquote({ children }: { children?: React.ReactNode }) {
            return (
              <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-4 text-gray-700 dark:text-gray-300">
                {children}
              </blockquote>
            )
          },
          table({ children }: { children?: React.ReactNode }) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
                  {children}
                </table>
              </div>
            )
          },
          th({ children }: { children?: React.ReactNode }) {
            return (
              <th className="border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-4 py-2 text-left font-semibold">
                {children}
              </th>
            )
          },
          td({ children }: { children?: React.ReactNode }) {
            return (
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                {children}
              </td>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>

      {/* Sources Citations */}
      {sources && sources.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            📚 Sources ({sources.length})
            {sources.some(s => s.category === 'WEB_SEARCH') && (
              <span className="text-[10px] px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                🌐 Recherche web activée
              </span>
            )}
          </h4>
          <div className="space-y-2">
            {sources.map((source, i) => (
              <div
                key={i}
                className="text-xs bg-gray-50 dark:bg-gray-800 rounded-md p-3 hover:bg-gray-100 dark:hover:bg-gray-750 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    {source.url ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        [{i + 1}] {source.title || source.documentName}
                      </a>
                    ) : (
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        [{i + 1}] {source.title || source.documentName}
                      </span>
                    )}
                    <div className="text-gray-500 dark:text-gray-400 mt-1">
                      <span className="inline-flex items-center gap-1">
                        <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px] font-medium">
                          {source.category}
                        </span>
                        {source.similarity !== undefined && (
                          <span className="text-[10px]">
                            • Pertinence: {typeof source.similarity === 'number' ? (source.similarity * 100).toFixed(0) : source.similarity}%
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
