import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { uploadPDF } from '../utils/api'

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function UploadPanel({ onDocumentAdded }) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle') // idle | uploading | success | error
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const handleFile = useCallback((f) => {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported.')
      return
    }
    setFile(f)
    setStatus('idle')
    setError('')
    setProgress(0)
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    handleFile(f)
  }, [handleFile])

  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  const handleUpload = async () => {
    if (!file || status === 'uploading') return
    setStatus('uploading')
    setProgress(0)
    setError('')

    try {
      const doc = await uploadPDF(file, setProgress)
      setStatus('success')
      onDocumentAdded(doc)
    } catch (err) {
      setStatus('error')
      setError(err.message)
    }
  }

  const reset = () => {
    setFile(null)
    setStatus('idle')
    setProgress(0)
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer
          ${dragging ? 'border-accent-500 bg-accent-400/5 scale-[1.01]' : 'border-ink-200 hover:border-ink-300 hover:bg-paper-200/50'}
          ${file ? 'border-ink-300 bg-paper-200/50' : ''}
        `}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !file && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {!file ? (
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-ink-100 flex items-center justify-center">
                <Upload className="w-6 h-6 text-ink-400" />
              </div>
            </div>
            <div>
              <p className="font-medium text-ink-700 font-body">
                Drop your PDF here
              </p>
              <p className="text-sm text-ink-400 mt-1">or click to browse</p>
            </div>
            <p className="text-xs text-ink-300">Supports text-based PDFs up to 50 MB</p>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-lg bg-accent-400/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-accent-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-ink-800 truncate text-sm">{file.name}</p>
              <p className="text-xs text-ink-400">{formatBytes(file.size)}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); reset() }}
              className="w-7 h-7 rounded-full hover:bg-ink-100 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-ink-400" />
            </button>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {status === 'uploading' && (
        <div className="space-y-1 animate-fade-in">
          <div className="flex justify-between text-xs text-ink-400">
            <span>Uploading & indexing…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Status messages */}
      {status === 'success' && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 animate-fade-in">
          <CheckCircle className="w-4 h-4" />
          <span>Document indexed — ready to chat!</span>
        </div>
      )}

      {(status === 'error' || error) && (
        <div className="flex items-start gap-2 text-sm text-accent-500 animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload button */}
      {file && status !== 'success' && (
        <button
          onClick={handleUpload}
          disabled={status === 'uploading'}
          className="
            w-full py-2.5 px-4 rounded-lg font-medium text-sm
            bg-ink-800 text-paper-100 hover:bg-ink-700
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center gap-2
            transition-all duration-200
            animate-fade-in
          "
        >
          {status === 'uploading' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Index PDF
            </>
          )}
        </button>
      )}
    </div>
  )
}
