"""
pdf_processor.py
----------------
Extracts text from PDFs page-by-page, then chunks each page's content.
Each chunk retains its page number for accurate citation.
"""

import io
import re
from dataclasses import dataclass, field
from typing import List

import pdfplumber


@dataclass
class PageChunk:
    """A text chunk that knows which page it came from."""
    chunk_id: str          # e.g. "doc_abc123_p3_c1"
    doc_id: str
    page_number: int       # 1-indexed
    text: str
    char_start: int = 0
    char_end: int = 0
    metadata: dict = field(default_factory=dict)


def _clean_text(text: str) -> str:
    """Remove excessive whitespace while preserving paragraph breaks."""
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    return text.strip()


def _chunk_text(text: str, chunk_size: int, overlap: int) -> List[str]:
    """Split text into overlapping word-based chunks."""
    words = text.split()
    if not words:
        return []

    chunks = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        if end == len(words):
            break
        start += chunk_size - overlap
    return chunks


def extract_chunks(
    pdf_bytes: bytes,
    doc_id: str,
    chunk_size: int = 500,
    overlap: int = 50,
) -> List[PageChunk]:
    """
    Extract text from a PDF and return a list of PageChunk objects.

    Each chunk includes:
    - The page number it originated from
    - A unique chunk_id for vector-store retrieval
    """
    chunks: List[PageChunk] = []

    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        total_pages = len(pdf.pages)

        for page_idx, page in enumerate(pdf.pages):
            page_num = page_idx + 1
            raw_text = page.extract_text() or ""
            text = _clean_text(raw_text)

            if not text:
                continue

            page_chunks = _chunk_text(text, chunk_size, overlap)

            for chunk_idx, chunk_text in enumerate(page_chunks):
                chunk_id = f"{doc_id}_p{page_num}_c{chunk_idx + 1}"
                chunks.append(
                    PageChunk(
                        chunk_id=chunk_id,
                        doc_id=doc_id,
                        page_number=page_num,
                        text=chunk_text,
                        metadata={
                            "total_pages": total_pages,
                            "page_number": page_num,
                            "chunk_index": chunk_idx + 1,
                            "chunk_total": len(page_chunks),
                        },
                    )
                )

    return chunks


def get_pdf_metadata(pdf_bytes: bytes) -> dict:
    """Extract basic metadata from a PDF."""
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        info = pdf.metadata or {}
        return {
            "total_pages": len(pdf.pages),
            "title": info.get("Title", ""),
            "author": info.get("Author", ""),
            "subject": info.get("Subject", ""),
            "creator": info.get("Creator", ""),
        }
