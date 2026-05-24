import { useState, useEffect } from 'react'
import { BookOpen, Cpu, Zap, AlertTriangle } from 'lucide-react'
import UploadPanel from './components/UploadPanel'
import DocumentList from './components/DocumentList'
import ChatPanel from './components/ChatPanel'
import { healthCheck } from './utils/api'

export default function App() {
  const [documents, setDocuments] = useState([])
  const [activeDocument, setActiveDocument] = useState(null)
  const [backendStatus, setBackendStatus] = useState('checking') // checking | ok | error
  const [health, setHealth] = useState(null)

  useEffect(() => {
    healthCheck()
      .then((data) => {
        setHealth(data)
        setBackendStatus('ok')
      })
      .catch(() => setBackendStatus('error'))
  }, [])

  const handleDocumentAdded = (doc) => {
    setDocuments((prev) => {
      const exists = prev.find((d) => d.doc_id === doc.doc_id)
      if (exists) return prev
      return [doc, ...prev]
    })
    setActiveDocument(doc)
  }

  const handleDocumentDeleted = (docId) => {
    setDocuments((prev) => prev.filter((d) => d.doc_id !== docId))
    if (activeDocument?.doc_id === docId) {
      setActiveDocument(documents.find((d) => d.doc_id !== docId) || null)
    }
  }

  return (
    <div className="min-h-screen bg-paper-100 flex flex-col">
      {/* Header */}
      <header className="bg-ink-900 text-paper-100 px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-500 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight">
              PageIndex<span className="text-accent-400">RAG</span>
            </h1>
            <p className="text-xs text-ink-400 -mt-0.5">PDF Chat · Groq + FAISS + sentence-transformers</p>
          </div>
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-2">
          {health && (
            <>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ink-800 text-xs text-ink-300">
                <Cpu className="w-3 h-3" />
                {health.embed_model}
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ink-800 text-xs text-ink-300">
                <Zap className="w-3 h-3 text-accent-400" />
                {health.groq_model}
              </div>
            </>
          )}
          <div className={`
            w-2 h-2 rounded-full flex-shrink-0
            ${backendStatus === 'ok' ? 'bg-emerald-400 animate-pulse-soft' : ''}
            ${backendStatus === 'checking' ? 'bg-yellow-400 animate-pulse-soft' : ''}
            ${backendStatus === 'error' ? 'bg-accent-400' : ''}
          `} title={`Backend: ${backendStatus}`} />
        </div>
      </header>

      {/* Backend error banner */}
      {backendStatus === 'error' && (
        <div className="bg-accent-500/10 border-b border-accent-500/20 px-6 py-2.5 flex items-center gap-2 text-sm text-accent-600">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Cannot reach backend. Make sure the FastAPI server is running on port 8000.</span>
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left sidebar */}
        <aside className="w-80 flex-shrink-0 border-r border-ink-100 bg-paper-50 flex flex-col overflow-hidden">
          {/* Upload section */}
          <div className="p-5 border-b border-ink-100">
            <h2 className="font-display text-base font-semibold text-ink-700 mb-4">
              Upload Document
            </h2>
            <UploadPanel onDocumentAdded={handleDocumentAdded} />
          </div>

          {/* Document list */}
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-semibold text-ink-700">
                Documents
              </h2>
              {documents.length > 0 && (
                <span className="text-xs text-ink-400 bg-ink-100 px-2 py-0.5 rounded-full">
                  {documents.length}
                </span>
              )}
            </div>
            <DocumentList
              documents={documents}
              activeDocId={activeDocument?.doc_id}
              onSelect={setActiveDocument}
              onDeleted={handleDocumentDeleted}
            />
          </div>

          {/* Tech stack footer */}
          <div className="p-4 border-t border-ink-100">
            <div className="bg-ink-50 rounded-lg p-3 space-y-1.5 text-xs text-ink-400">
              <div className="flex items-center justify-between">
                <span>LLM</span>
                <span className="font-mono text-ink-500">Groq (free)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Embeddings</span>
                <span className="font-mono text-ink-500">sentence-transformers</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Vector DB</span>
                <span className="font-mono text-ink-500">FAISS (in-memory)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>PDF parsing</span>
                <span className="font-mono text-ink-500">pdfplumber</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Chat area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <ChatPanel document={activeDocument} />
        </main>
      </div>
    </div>
  )
}
