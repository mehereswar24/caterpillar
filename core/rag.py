import os
import re

KB_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'kb')

class SimpleRAG:
    def __init__(self):
        self.documents = []
        self._load_kb()

    def _load_kb(self):
        if not os.path.exists(KB_DIR):
            return
        for filename in os.listdir(KB_DIR):
            if filename.endswith(".txt"):
                with open(os.path.join(KB_DIR, filename), 'r', encoding='utf-8') as f:
                    content = f.read()
                    # Split by double newlines or headers
                    chunks = [c.strip() for c in content.split('\n') if c.strip()]
                    self.documents.extend(chunks)

    def retrieve(self, query: str, top_k: int = 3):
        # Extremely simple keyword overlap for hackathon RAG
        query_words = set(re.findall(r'\w+', query.lower()))
        scores = []
        for doc in self.documents:
            doc_words = set(re.findall(r'\w+', doc.lower()))
            score = len(query_words.intersection(doc_words))
            scores.append((score, doc))
        
        # Sort by score descending
        scores.sort(key=lambda x: x[0], reverse=True)
        # Return top_k docs that have at least 1 matching word
        return [doc for score, doc in scores[:top_k] if score > 0]

    def format_prompt(self, query: str):
        context_chunks = self.retrieve(query)
        if not context_chunks:
            return None
        
        context_text = "\n".join(f"- {chunk}" for chunk in context_chunks)
        prompt = f"You are a CAT machinery assistant. Use the following manuals to answer the operator's question.\n\nContext:\n{context_text}\n\nOperator Question: {query}\n\nAnswer simply and directly for a busy operator:"
        return prompt
