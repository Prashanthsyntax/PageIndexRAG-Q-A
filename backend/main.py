"""
main.py
-------
FastAPI backend for PageIndexRAG.

Endpoints:
  POST /api/upload         — Upload & index a PDF
  POST /api/chat           — Ask a question (streaming SSE)
  GET  /api/documents      — List indexed documents
  DELETE /api/documents/{doc_id} — Remove a document
  GET  /api/health         — Health check
"""

import uuid
import json
import asyncio
from typing import Dict, Any

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from config import settings
from pdf_processor import extract_chunks, get_pdf_metadata
from vector_store import VectorStoreManager
from llm_client import GroqLLMClient


# ---------------------------------------------------------------------------
# App & Middleware
# ---------------------------------------------------------------------------

app = FastAPI(
    title="PageIndexRAG API",
    description="Upload PDFs and chat with them using Groq + local embeddings.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Shared singletons (initialised once on startup)
# ---------------------------------------------------------------------------

vector_manager: VectorStoreManager = None
llm_client: GroqLLMClient = None

# In-memory document registry  {doc_id: {name, pages, chunks, metadata}}
document_registry: Dict[str, Dict[str, Any]] = {}


@app.on_event("startup")
async def startup():
    global vector_manager, llm_client
    vector_manager = VectorStoreManager(model_name=settings.EMBED_MODEL)
    llm_client = GroqLLMClient()
    print("[Startup] PageIndexRAG backend ready.")


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    doc_id: str
    question: str
    stream: bool = True


class DocumentInfo(BaseModel):
    doc_id: str
    filename: str
    total_pages: int
    total_chunks: int
    metadata: dict


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "groq_model": settings.GROQ_MODEL,
        "embed_model": settings.EMBED_MODEL,
        "indexed_docs": len(document_registry),
    }


@app.post("/api/upload", response_model=DocumentInfo)
async def upload_pdf(file: UploadFile = File(...)):
    """Upload a PDF, extract text, chunk it, and build a FAISS index."""

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    content = await file.read()

    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {settings.MAX_FILE_SIZE_MB} MB.",
        )

    doc_id = str(uuid.uuid4())

    # Extract PDF metadata
    try:
        pdf_meta = get_pdf_metadata(content)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not read PDF: {e}")

    # Chunk extraction
    try:
        chunks = extract_chunks(
            pdf_bytes=content,
            doc_id=doc_id,
            chunk_size=settings.CHUNK_SIZE,
            overlap=settings.CHUNK_OVERLAP,
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"PDF processing failed: {e}")

    if not chunks:
        raise HTTPException(
            status_code=422,
            detail="No text could be extracted from this PDF. It may be image-only/scanned.",
        )

    # Build vector index
    total_chunks = vector_manager.index_document(doc_id, chunks)

    # Register document
    document_registry[doc_id] = {
        "filename": file.filename,
        "total_pages": pdf_meta["total_pages"],
        "total_chunks": total_chunks,
        "metadata": pdf_meta,
    }

    return DocumentInfo(
        doc_id=doc_id,
        filename=file.filename,
        total_pages=pdf_meta["total_pages"],
        total_chunks=total_chunks,
        metadata=pdf_meta,
    )


@app.post("/api/chat")
async def chat(req: ChatRequest):
    """
    RAG Q&A endpoint.
    Returns a Server-Sent Event stream of answer tokens, followed by
    a final 'sources' event with page citations.
    """

    if not vector_manager.has_doc(req.doc_id):
        raise HTTPException(status_code=404, detail="Document not found or not indexed.")

    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    if not settings.GROQ_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY is not configured on the server.",
        )

    # Retrieve relevant chunks
    results = vector_manager.search(
        doc_id=req.doc_id,
        query=req.question,
        top_k=settings.TOP_K,
    )

    if not results:
        async def no_results():
            yield "data: " + json.dumps({"type": "token", "content": "I could not find relevant content in the document for your question."}) + "\n\n"
            yield "data: " + json.dumps({"type": "done"}) + "\n\n"
        return StreamingResponse(no_results(), media_type="text/event-stream")

    # Build source citations
    sources = []
    seen = set()
    for r in results:
        pg = r.chunk.page_number
        if pg not in seen:
            seen.add(pg)
            sources.append({
                "page": pg,
                "score": round(r.score, 4),
                "excerpt": r.chunk.text[:200] + ("..." if len(r.chunk.text) > 200 else ""),
            })
    sources.sort(key=lambda x: x["page"])

    async def event_stream():
        try:
            async for token in llm_client.answer_stream(req.question, results):
                yield "data: " + json.dumps({"type": "token", "content": token}) + "\n\n"
                await asyncio.sleep(0)  # yield control

            # Send sources after answer
            yield "data: " + json.dumps({"type": "sources", "sources": sources}) + "\n\n"
            yield "data: " + json.dumps({"type": "done"}) + "\n\n"

        except Exception as e:
            yield "data: " + json.dumps({"type": "error", "message": str(e)}) + "\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.get("/api/documents")
async def list_documents():
    """Return all currently indexed documents."""
    docs = []
    for doc_id, info in document_registry.items():
        docs.append({
            "doc_id": doc_id,
            **info,
        })
    return {"documents": docs, "total": len(docs)}


@app.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Remove a document and its vector index."""
    if doc_id not in document_registry:
        raise HTTPException(status_code=404, detail="Document not found.")

    vector_manager.remove(doc_id)
    del document_registry[doc_id]

    return {"message": "Document deleted successfully.", "doc_id": doc_id}


@app.get("/api/documents/{doc_id}/chunks")
async def get_document_chunks_info(doc_id: str):
    """Return chunk count info for a document."""
    if doc_id not in document_registry:
        raise HTTPException(status_code=404, detail="Document not found.")

    info = document_registry[doc_id]
    return {
        "doc_id": doc_id,
        "filename": info["filename"],
        "total_chunks": info["total_chunks"],
        "total_pages": info["total_pages"],
    }
