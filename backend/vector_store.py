"""
vector_store.py
---------------
In-memory FAISS vector store using sentence-transformers embeddings.
Fully open-source — no external API calls for embeddings.

Each document gets its own isolated index so multiple PDFs can be
loaded simultaneously.
"""

import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Optional
from dataclasses import dataclass

from pdf_processor import PageChunk


@dataclass
class SearchResult:
    chunk: PageChunk
    score: float            # cosine similarity (higher = better)


class DocumentVectorStore:
    """
    Manages embeddings and FAISS index for a single document.
    """

    def __init__(self, model: SentenceTransformer):
        self.model = model
        self.index: Optional[faiss.IndexFlatIP] = None
        self.chunks: List[PageChunk] = []
        self.chunk_id_map: Dict[str, int] = {}   # chunk_id -> list position

    def build(self, chunks: List[PageChunk]) -> None:
        """Embed all chunks and build the FAISS index."""
        if not chunks:
            return

        self.chunks = chunks
        texts = [c.text for c in chunks]

        # Encode — normalize for cosine similarity via inner product
        embeddings = self.model.encode(
            texts,
            batch_size=32,
            show_progress_bar=False,
            normalize_embeddings=True,
        ).astype(np.float32)

        dim = embeddings.shape[1]
        self.index = faiss.IndexFlatIP(dim)   # Inner Product on normalized vecs = cosine sim
        self.index.add(embeddings)

        self.chunk_id_map = {c.chunk_id: i for i, c in enumerate(chunks)}

    def search(self, query: str, top_k: int = 5) -> List[SearchResult]:
        """Retrieve the top-k most relevant chunks for a query."""
        if self.index is None or len(self.chunks) == 0:
            return []

        query_vec = self.model.encode(
            [query],
            normalize_embeddings=True,
        ).astype(np.float32)

        k = min(top_k, len(self.chunks))
        scores, indices = self.index.search(query_vec, k)

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0:
                continue
            results.append(SearchResult(chunk=self.chunks[idx], score=float(score)))

        return results

    @property
    def total_chunks(self) -> int:
        return len(self.chunks)


class VectorStoreManager:
    """
    Global registry of per-document vector stores.
    Keeps the embedding model loaded once in memory.
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        print(f"[VectorStoreManager] Loading embedding model: {model_name}")
        self.model = SentenceTransformer(model_name)
        self._stores: Dict[str, DocumentVectorStore] = {}
        print("[VectorStoreManager] Embedding model ready.")

    def index_document(self, doc_id: str, chunks: List[PageChunk]) -> int:
        """Index a document; returns number of chunks indexed."""
        store = DocumentVectorStore(self.model)
        store.build(chunks)
        self._stores[doc_id] = store
        return store.total_chunks

    def search(self, doc_id: str, query: str, top_k: int = 5) -> List[SearchResult]:
        """Search a specific document's index."""
        store = self._stores.get(doc_id)
        if store is None:
            return []
        return store.search(query, top_k)

    def remove(self, doc_id: str) -> None:
        self._stores.pop(doc_id, None)

    def list_docs(self) -> List[str]:
        return list(self._stores.keys())

    def has_doc(self, doc_id: str) -> bool:
        return doc_id in self._stores

    def doc_chunk_count(self, doc_id: str) -> int:
        store = self._stores.get(doc_id)
        return store.total_chunks if store else 0
