"""
rag_ask.py — CLI bridge between Express and RAG engine.
Usage: python rag_ask.py prompt '{"question":"...","operator_context":{}}'
       python rag_ask.py retrieve '{"question":"..."}'
"""
import sys, json, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rag import get_engine

cmd     = sys.argv[1] if len(sys.argv) > 1 else 'prompt'
payload = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
engine  = get_engine()

question = payload.get('question', '')
op_ctx   = payload.get('operator_context', {})

if cmd == 'prompt':
    prompt  = engine.build_prompt(question, op_ctx)
    sources = [h['source'] for h in engine.retrieve(question)]
    print(json.dumps({'prompt': prompt, 'sources': sources}))
elif cmd == 'retrieve':
    hits = engine.retrieve(question)
    print(json.dumps({'hits': hits}))
else:
    print(json.dumps({'error': f'unknown command: {cmd}'}))
