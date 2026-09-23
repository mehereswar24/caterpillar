"""
rag.py - Production-grade RAG engine for CAT Smart Operator.
Hybrid BM25 + TF-IDF cosine scoring, sentence-level chunking, 8 KB documents.
No external dependencies - fully offline.
"""
import os, re, math, json
from collections import Counter

KB_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'kb')

STOP = {'a','an','the','is','it','in','on','at','to','of','for','and','or',
        'but','with','this','that','be','are','was','were','as','by','from',
        'not','if','so','do','its','we','you','he','she','they','have','has'}

def tokenize(text):
    words = re.findall(r'\b[a-z]{2,}\b', text.lower())
    return [w for w in words if w not in STOP]

def split_sentences(text):
    raw = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)
    out, buf = [], ''
    for s in raw:
        buf = (buf + ' ' + s).strip()
        if len(buf) >= 120:
            out.append(buf); buf = ''
    if buf and len(buf) >= 40:
        out.append(buf)
    return out

class BM25:
    def __init__(self, docs, k1=1.5, b=0.75):
        self.k1, self.b, self.N = k1, b, len(docs)
        self.tok   = [tokenize(d) for d in docs]
        self.avgdl = sum(len(t) for t in self.tok) / max(self.N, 1)
        df = Counter()
        for tok in self.tok:
            for w in set(tok): df[w] += 1
        self.idf = {w: math.log((self.N - f + 0.5) / (f + 0.5) + 1)
                    for w, f in df.items()}

    def score(self, q_tok, idx):
        tok, tf = self.tok[idx], Counter(self.tok[idx])
        dl = len(tok)
        s = 0.0
        for w in q_tok:
            if w not in tf: continue
            num = tf[w] * (self.k1 + 1)
            den = tf[w] + self.k1 * (1 - self.b + self.b * dl / self.avgdl)
            s  += self.idf.get(w, 0) * num / den
        return s

def _cosine(q_tok, d_tok, idf):
    if not q_tok or not d_tok: return 0.0
    tq, td = Counter(q_tok), Counter(d_tok)
    common = set(q_tok) & set(d_tok)
    if not common: return 0.0
    lq, ld = len(q_tok), len(d_tok)
    dot = sum((tq[w]/lq)*idf.get(w,1)*(td[w]/ld)*idf.get(w,1) for w in common)
    nq  = math.sqrt(sum(((tq[w]/lq)*idf.get(w,1))**2 for w in tq))
    nd  = math.sqrt(sum(((td[w]/ld)*idf.get(w,1))**2 for w in td))
    return dot / (nq * nd) if nq and nd else 0.0

class RAGEngine:
    def __init__(self):
        self.chunks, self.sources, self.titles = [], [], []
        self._load()
        if self.chunks:
            self.bm25 = BM25(self.chunks)
            self.toks = [tokenize(c) for c in self.chunks]
            N = len(self.chunks)
            df = Counter()
            for tok in self.toks:
                for w in set(tok): df[w] += 1
            self.idf = {w: math.log((N+1)/(f+1))+1 for w,f in df.items()}
        else:
            self.bm25 = None

    def _load(self):
        if not os.path.exists(KB_DIR):
            return
        for fname in sorted(os.listdir(KB_DIR)):
            if not fname.endswith('.txt'): continue
            try:
                text = open(os.path.join(KB_DIR, fname), encoding='utf-8').read()
            except Exception:
                continue
            lines = [l.strip() for l in text.splitlines() if l.strip()]
            title = lines[0] if lines else fname
            for para in re.split(r'\n{2,}', text):
                para = para.strip()
                if len(para) < 40: continue
                for sent in split_sentences(para):
                    self.chunks.append(sent)
                    self.sources.append(fname)
                    self.titles.append(title)

    def retrieve(self, query, top_k=5, alpha=0.6):
        if not self.chunks or not self.bm25: return []
        q_tok = tokenize(query)
        if not q_tok: return []
        raw_bm = [self.bm25.score(q_tok, i) for i in range(len(self.chunks))]
        bm_max = max(raw_bm) if raw_bm else 1
        scores = []
        for i, bm in enumerate(raw_bm):
            cos    = _cosine(q_tok, self.toks[i], self.idf)
            hybrid = alpha * bm / max(bm_max, 1e-9) + (1-alpha) * cos
            if hybrid > 0.01:
                scores.append((hybrid, i))
        scores.sort(reverse=True)
        seen, results = set(), []
        for score, i in scores:
            key = self.chunks[i][:60]
            if key in seen: continue
            seen.add(key)
            results.append({'text': self.chunks[i], 'source': self.sources[i],
                            'title': self.titles[i], 'score': round(score, 4)})
            if len(results) >= top_k: break
        return results

    def build_prompt(self, query, operator_context=None):
        hits    = self.retrieve(query, top_k=5)
        context = '\n'.join(f'[{h["source"]}] {h["text"]}' for h in hits) \
                  if hits else 'No relevant section found.'
        op_sec  = ''
        if operator_context:
            op_sec = '\nCURRENT OPERATOR STATUS:\n' + \
                     '\n'.join(f'  {k}: {v}' for k,v in operator_context.items())
        return (
            "You are the CAT Smart Operator voice assistant inside a CAT 320 excavator.\n"
            "Answer using ONLY the knowledge base. Be concise - 2-3 sentences max.\n"
            "For safety emergencies start with: SAFETY ALERT.\n\n"
            f"KNOWLEDGE BASE:\n{context}\n{op_sec}\n\n"
            f"OPERATOR QUESTION: {query}\n\nANSWER:"
        )

    def stats(self):
        return {'total_chunks': len(self.chunks),
                'documents': len(Counter(self.sources)),
                'per_document': dict(Counter(self.sources))}

_engine = None
def get_engine():
    global _engine
    if _engine is None:
        _engine = RAGEngine()
    return _engine

if __name__ == '__main__':
    e = get_engine()
    print(json.dumps(e.stats(), indent=2))
    for q in ['maximum safe tilt angle','engine overheating','hydraulic oil change interval',
              'I feel tired','worker struck by machine','auger attachment','fuel tank capacity']:
        hits = e.retrieve(q, top_k=2)
        print(f'\nQ: {q}')
        for h in hits:
            print(f'  [{h["score"]:.3f}] {h["source"]}: {h["text"][:100]}')
