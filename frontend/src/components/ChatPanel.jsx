import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, RotateCcw, Loader2, MessageSquare } from 'lucide-react'
import { streamChat } from '../utils/api'
import ChatMessage from './ChatMessage'

const SUGGESTED_QUESTIONS = [
  'What is the main topic of this document?',
  'Summarize the key points.',
  'What conclusions does the document draw?',
  'Are there any statistics or data mentioned?',
]

export default function ChatPanel({ document }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Reset on document change
  useEffect(() => {
    setMessages([])
    setInput('')
    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [document?.doc_id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const appendMessage = (msg) => {
    setMessages((prev) => [...prev, msg])
  }

  const updateLastAssistant = (updater) => {
    setMessages((prev) => {
      const msgs = [...prev]
      const lastIdx = msgs.length - 1
      if (msgs[lastIdx]?.role === 'assistant') {
        msgs[lastIdx] = updater(msgs[lastIdx])
      }
      return msgs
    })
  }

  const sendQuestion = useCallback(async (question) => {
    if (!question.trim() || loading || !document) return

    setInput('')
    setLoading(true)

    appendMessage({ role: 'user', content: question, id: Date.now() })

    const assistantId = Date.now() + 1
    appendMessage({
      role: 'assistant',
      content: '',
      streaming: true,
      sources: null,
      error: null,
      id: assistantId,
    })

    await streamChat({
      docId: document.doc_id,
      question,
      onToken: (token) => {
        updateLastAssistant((msg) => ({
          ...msg,
          content: msg.content + token,
        }))
      },
      onSources: (sources) => {
        updateLastAssistant((msg) => ({ ...msg, sources }))
      },
      onDone: () => {
        updateLastAssistant((msg) => ({ ...msg, streaming: false }))
        setLoading(false)
      },
      onError: (err) => {
        updateLastAssistant((msg) => ({
          ...msg,
          streaming: false,
          error: err.message,
          content: msg.content || 'An error occurred while generating the answer.',
        }))
        setLoading(false)
      },
    })
  }, [document, loading])

  const handleSubmit = (e) => {
    e.preventDefault()
    sendQuestion(input.trim())
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendQuestion(input.trim())
    }
  }

  if (!document) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-8">
        <div className="space-y-3">
          <div className="w-16 h-16 rounded-full bg-ink-100 flex items-center justify-center mx-auto">
            <MessageSquare className="w-8 h-8 text-ink-300" />
          </div>
          <h3 className="font-display text-xl text-ink-600">Select a document</h3>
          <p className="text-sm text-ink-300 max-w-xs">
            Upload a PDF and select it from the sidebar to start chatting.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Document header */}
      <div className="px-6 py-3 border-b border-ink-100 bg-paper-100/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-medium text-ink-800 text-sm truncate max-w-md">{document.filename}</h2>
            <p className="text-xs text-ink-400 mt-0.5">
              {document.total_pages} pages · {document.total_chunks} indexed chunks
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-600 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-center text-sm text-ink-300">
              Ask anything about <span className="font-medium text-ink-500">{document.filename}</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendQuestion(q)}
                  className="
                    text-left p-3 rounded-lg border border-ink-100 bg-white
                    hover:border-ink-200 hover:bg-paper-100
                    text-sm text-ink-600 transition-all duration-150
                    hover:shadow-sm
                  "
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-6 py-4 border-t border-ink-100 bg-paper-100/80 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about the document…"
            rows={1}
            disabled={loading}
            className="
              flex-1 resize-none rounded-xl border border-ink-200
              px-4 py-3 text-sm text-ink-800 placeholder-ink-300
              bg-white focus:outline-none focus:border-ink-400
              disabled:opacity-50 transition-colors
              font-body leading-relaxed
              min-h-[48px] max-h-32
            "
            style={{ overflowY: 'auto' }}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="
              w-12 h-12 rounded-xl bg-ink-800 text-paper-100
              flex items-center justify-center
              hover:bg-ink-700 disabled:opacity-40 disabled:cursor-not-allowed
              transition-all duration-150 flex-shrink-0 self-end
            "
          >
            {loading
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <Send className="w-5 h-5" />
            }
          </button>
        </form>
        <p className="text-xs text-ink-300 mt-2 text-center">
          Powered by Groq · Local embeddings via sentence-transformers · FAISS
        </p>
      </div>
    </div>
  )
}
