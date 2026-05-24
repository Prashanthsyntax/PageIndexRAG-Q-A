"""
llm_client.py
-------------
Groq-backed LLM client for RAG answer generation.
Groq provides free, fast inference on open-source models (Llama 3, Mixtral, etc.)
"""

from typing import List, AsyncGenerator
from groq import AsyncGroq

from config import settings
from vector_store import SearchResult


SYSTEM_PROMPT = """You are PageIndexRAG, an expert document assistant.
You answer questions strictly based on the provided document context.

Rules:
1. Only use information from the CONTEXT sections below.
2. Always cite page numbers like (Page N) when referencing specific content.
3. If multiple pages support your answer, cite all relevant pages.
4. If the context does not contain enough information, say "I could not find sufficient information in the document to answer this question."
5. Be concise, accurate, and helpful.
6. Do not make up information not present in the context.
"""


def build_rag_prompt(query: str, results: List[SearchResult]) -> str:
    """Build a prompt with retrieved context chunks."""
    context_blocks = []
    seen_pages = set()

    for r in results:
        page = r.chunk.page_number
        label = f"[Page {page}]"
        if page not in seen_pages:
            seen_pages.add(page)
        context_blocks.append(f"{label}\n{r.chunk.text}")

    context_str = "\n\n---\n\n".join(context_blocks)

    return f"""CONTEXT from document:

{context_str}

---

USER QUESTION: {query}

Answer based only on the context above. Cite page numbers."""


class GroqLLMClient:
    def __init__(self):
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        self.model = settings.GROQ_MODEL

    async def answer(
        self,
        query: str,
        results: List[SearchResult],
    ) -> str:
        """Generate a full answer (non-streaming)."""
        user_msg = build_rag_prompt(query, results)

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.2,
            max_tokens=1024,
        )
        return response.choices[0].message.content

    async def answer_stream(
        self,
        query: str,
        results: List[SearchResult],
    ) -> AsyncGenerator[str, None]:
        """Generate a streaming answer token by token."""
        user_msg = build_rag_prompt(query, results)

        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.2,
            max_tokens=1024,
            stream=True,
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
