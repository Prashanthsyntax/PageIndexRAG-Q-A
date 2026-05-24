import { FileText, Trash2, BookOpen, Hash } from 'lucide-react'
import { deleteDocument } from '../utils/api'
import { useState } from 'react'

export default function DocumentList({ documents, activeDocId, onSelect, onDeleted }) {
  const [deletingId, setDeletingId] = useState(null)

  const handleDelete = async (e, docId) => {
    e.stopPropagation()
    if (!window.confirm('Remove this document from the index?')) return
    setDeletingId(docId)
    try {
      await deleteDocument(docId)
      onDeleted(docId)
    } catch (err) {
      alert(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-ink-300">
        <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No documents yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {documents.map((doc) => {
        const isActive = doc.doc_id === activeDocId
        const isDeleting = deletingId === doc.doc_id

        return (
          <div
            key={doc.doc_id}
            onClick={() => onSelect(doc)}
            className={`
              group relative flex items-start gap-3 p-3 rounded-lg cursor-pointer
              border transition-all duration-150
              ${isActive
                ? 'bg-ink-800 border-ink-700 text-paper-100'
                : 'bg-paper-100 border-ink-100 hover:border-ink-200 hover:bg-paper-200 text-ink-700'
              }
            `}
          >
            <div className={`
              w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5
              ${isActive ? 'bg-ink-700' : 'bg-ink-100'}
            `}>
              <FileText className={`w-4 h-4 ${isActive ? 'text-paper-200' : 'text-ink-400'}`} />
            </div>

            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isActive ? 'text-paper-100' : 'text-ink-800'}`}>
                {doc.filename}
              </p>
              <div className={`flex items-center gap-3 mt-0.5 text-xs ${isActive ? 'text-ink-300' : 'text-ink-400'}`}>
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {doc.total_pages}p
                </span>
                <span className="flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  {doc.total_chunks} chunks
                </span>
              </div>
            </div>

            <button
              onClick={(e) => handleDelete(e, doc.doc_id)}
              disabled={isDeleting}
              className={`
                opacity-0 group-hover:opacity-100 transition-opacity
                w-6 h-6 rounded flex items-center justify-center
                ${isActive ? 'hover:bg-ink-600' : 'hover:bg-ink-100'}
                disabled:opacity-30
              `}
            >
              <Trash2 className={`w-3.5 h-3.5 ${isActive ? 'text-ink-300' : 'text-ink-400'}`} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
