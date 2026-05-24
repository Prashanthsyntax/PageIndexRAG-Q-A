import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BookOpen, Bot, User } from 'lucide-react'

function SourceBadge({ source }) {
  return (
    <div className="group relative inline-block">
      <span className="source-badge">
        <BookOpen className="w-3 h-3" />
        Page {source.page}
      </span>
      {/* Tooltip */}
      <div className="
        absolute bottom-full left-0 mb-2 w-64 p-3 rounded-lg
        bg-ink-800 text-paper-100 text-xs
        opacity-0 group-hover:opacity-100
        transition-opacity duration-150 pointer-events-none
        z-10 shadow-lg
      ">
        <p className="font-mono text-ink-300 mb-1">Page {source.page} · Score {source.score}</p>
        <p className="text-paper-200 leading-relaxed">{source.excerpt}</p>
      </div>
    </div>
  )
}

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user'
  const isStreaming = message.streaming

  return (
    <div className={`flex gap-3 animate-slide-up ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1
        ${isUser ? 'bg-ink-700' : 'bg-accent-500/10 border border-accent-500/20'}
      `}>
        {isUser
          ? <User className="w-4 h-4 text-paper-100" />
          : <Bot className="w-4 h-4 text-accent-500" />
        }
      </div>

      {/* Bubble */}
      <div className={`flex-1 max-w-[85%] ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div className={`
          rounded-xl px-4 py-3
          ${isUser
            ? 'bg-ink-800 text-paper-100 rounded-tr-sm'
            : 'bg-white border border-ink-100 text-ink-800 rounded-tl-sm shadow-sm'
          }
        `}>
          {isUser ? (
            <p className="text-sm leading-relaxed">{message.content}</p>
          ) : (
            <div className="prose-rag text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {isStreaming && <span className="cursor-blink" />}
            </div>
          )}
        </div>

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="text-xs text-ink-300 self-center">Sources:</span>
            {message.sources.map((s, i) => (
              <SourceBadge key={i} source={s} />
            ))}
          </div>
        )}

        {/* Error state */}
        {message.error && (
          <p className="mt-1 text-xs text-accent-500">{message.error}</p>
        )}
      </div>
    </div>
  )
}
