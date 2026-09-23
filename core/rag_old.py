"""
rag.py — TF-IDF RAG engine for CAT Smart Operator voice agent.
No external vector DB needed — fast, offline, hackathon-ready.
"""
import os, re, math
from collections import Counter

KB_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'kb')

def tokenize(text):
    return re.findall(r'\b[a-z]{2,}\b', text.lower())

def compute_idf(docs):
    N = len(docs)
    df = Counter()
    for doc in docs:
        for word in set(tokenize(doc)):
            df[word] += 1
    return {w: math.log((N + 1) / (f + 1)) + 1 for w, f in df.items()}

def tfidf_vector(tokens, idf):
    tf = Counter(tokens)
    total = len(tokens) or 1
    return {w: (tf[w] / total) * idf.get(w, 1) for w in tf}

def cosine(v1, v2):
    common = set(v1) & set(v2)
    if not common:
        return 0.0
    dot = sum(v1[w] * v2[w] for w in common)
    n1  = math.sqrt(sum(x*x for x in v1.values()))
    n2  = math.sqrt(sum(x*x for x in v2.values()))
    return dot / (n1 * n2) if n1 and n2 else 0.0


class RAGEngine:
    def __init__(self):
        self.chunks = []
        self.sources = []
        self._load()

    def _load(self):
        if not os.path.exists(KB_DIR):
            return
        for fname in sorted(os.listdir(KB_DIR)):
            if not fname.endswith('.txt'):
                continue
            path = os.path.join(KB_DIR, fname)
            try:
                text = open(path, encoding='utf-8').read()
            except Exception:
                continue
            # Chunk by paragraph (blank line) then by sentence for large blocks
            paragraphs = [p.strip() for p in re.split(r'\n{2,}', text) if p.strip()]
            for para in paragraphs:
                if len(para) < 20:
                    continue
                # Split long paragraphs at sentence boundaries
                sentences = re.split(r'(?<=[.!?])\s+', para)
                buf = ''
                for sent in sentences:
                    buf = (buf + ' ' + sent).strip()
                    if len(buf) >= 120:
                        self.chunks.append(buf)
                        self.sources.append(fname)
                        buf = ''
                if buf:
                    self.chunks.append(buf)
                    self.sources.append(fname)

        self.idf = compute_idf(self.chunks)
        self.vectors = [tfidf_vector(tokenize(c), self.idf) for c in self.chunks]

    def retrieve(self, query: str, top_k: int = 4):
        q_vec = tfidf_vector(tokenize(query), self.idf)
        scores = [(cosine(q_vec, v), i) for i, v in enumerate(self.vectors)]
        scores.sort(reverse=True)
        results = []
        for score, i in scores[:top_k]:
            if score > 0.05:
                results.append({'text': self.chunks[i], 'source': self.sources[i], 'score': round(score, 3)})
        return results

    def build_prompt(self, query: str, operator_context: dict = None) -> str:
        hits = self.retrieve(query)
        context = '\n'.join(f'[{h["source"]}] {h["text"]}' for h in hits) if hits else 'No relevant manual section found.'

        op_ctx = ''
        if operator_context:
            op_ctx = f"""
Current operator status:
- Machine: {operator_context.get('machine_id', 'EXC001')}
- Shift hours today: {operator_context.get('shift_hours', 'unknown')}
- Last break: {operator_context.get('last_break', 'unknown')}
- Active alerts: {operator_context.get('alerts', 'none')}
"""

        return f"""You are the CAT Smart Operator voice assistant. You help excavator operators with machine questions, health, safety, and maintenance.
Be concise — operators are busy. Answer in 2-3 sentences max. If urgent safety, say so clearly.

KNOWLEDGE BASE:
{context}
{op_ctx}
OPERATOR QUESTION: {query}

ANSWER:"""


# Singleton
_engine = None
def get_engine():
    global _engine
    if _engine is None:
        _engine = RAGEngine()
    return _engine
