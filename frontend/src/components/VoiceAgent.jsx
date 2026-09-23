import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, MessageSquare, Loader } from 'lucide-react';

const API = 'https://caterpillar-stack.onrender.com';

const SAMPLE_QUESTIONS = [
  "What is the maximum safe tilt angle?",
  "How often should I change the hydraulic oil?",
  "Engine is overheating, what should I do?",
  "When should I take a break?",
  "What are signs of operator fatigue?",
  "How do I check track tension?",
  "What is the fuel tank capacity?",
  "Pre-shift checklist steps?",
];

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.95; utt.pitch = 1; utt.volume = 1;
  window.speechSynthesis.speak(utt);
}

export default function VoiceAgent({ operatorContext }) {
  const [listening, setListening]   = useState(false);
  const [question,  setQuestion]    = useState('');
  const [answer,    setAnswer]      = useState('');
  const [sources,   setSources]     = useState([]);
  const [loading,   setLoading]     = useState(false);
  const [history,   setHistory]     = useState([]);
  const [ttsOn,     setTtsOn]       = useState(true);
  const recogRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recog = new SR();
    recog.continuous = false;
    recog.interimResults = false;
    recog.lang = 'en-US';
    recog.onresult = e => {
      const text = e.results[0][0].transcript;
      setQuestion(text);
      setListening(false);
      askQuestion(text);
    };
    recog.onerror = () => setListening(false);
    recog.onend   = () => setListening(false);
    recogRef.current = recog;
  }, []);

  const askQuestion = async (q) => {
    const text = q || question;
    if (!text.trim()) return;
    setLoading(true);
    setAnswer('');
    setSources([]);
    try {
      const r = await fetch(`${API}/api/voice/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, operator_context: operatorContext || {} }),
      });
      const data = await r.json();
      setAnswer(data.answer || data.error || 'No response.');
      setSources(data.sources || []);
      setHistory(h => [{ question: text, answer: data.answer, sources: data.sources }, ...h.slice(0, 9)]);
      if (ttsOn && data.answer) speak(data.answer);
    } catch (e) {
      setAnswer(`Error: ${e.message}`);
    }
    setLoading(false);
  };

  const toggleMic = () => {
    if (!recogRef.current) return alert('Speech recognition not supported in this browser.');
    if (listening) {
      recogRef.current.stop();
      setListening(false);
    } else {
      recogRef.current.start();
      setListening(true);
    }
  };

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-cat-yellow rounded-lg flex items-center justify-center">
            <MessageSquare size={16} className="text-black"/>
          </div>
          <span className="text-white font-semibold">Smart Operator Assistant</span>
          <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded-full">RAG + Qwen2.5:7b</span>
        </div>
        <button onClick={() => setTtsOn(v => !v)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-all ${ttsOn ? 'bg-cat-yellow/10 border-cat-yellow text-cat-yellow' : 'border-gray-600 text-gray-500'}`}>
          <Volume2 size={12}/> {ttsOn ? 'Voice On' : 'Voice Off'}
        </button>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Answer display */}
        {(answer || loading) && (
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            {loading ? (
              <div className="flex items-center gap-3 text-gray-400">
                <Loader size={16} className="animate-spin text-cat-yellow"/>
                <span className="text-sm">Searching knowledge base...</span>
              </div>
            ) : (
              <>
                <p className="text-white text-sm leading-relaxed">{answer}</p>
                {sources.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {[...new Set(sources)].map(s => (
                      <span key={s} className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">
                        📄 {s.replace('.txt','')}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Input row */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && askQuestion()}
            placeholder="Ask about machinery, maintenance, health, safety..."
            className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cat-yellow"
          />
          <button onClick={toggleMic}
            className={`px-4 py-2.5 rounded-xl border transition-all ${listening ? 'bg-red-600 border-red-500 text-white animate-pulse' : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-cat-yellow'}`}>
            {listening ? <MicOff size={16}/> : <Mic size={16}/>}
          </button>
          <button onClick={() => askQuestion()} disabled={loading || !question.trim()}
            className="px-4 py-2.5 rounded-xl bg-cat-yellow text-black font-semibold text-sm disabled:opacity-40 hover:bg-yellow-400 transition-all">
            Ask
          </button>
        </div>

        {/* Sample questions */}
        <div>
          <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Quick questions</div>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_QUESTIONS.map(q => (
              <button key={q} onClick={() => { setQuestion(q); askQuestion(q); }}
                className="text-xs bg-gray-800 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-full hover:border-cat-yellow hover:text-cat-yellow transition-all">
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* History */}
        {history.length > 1 && (
          <div>
            <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Recent</div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {history.slice(1).map((h, i) => (
                <div key={i} className="bg-gray-800/50 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-800 transition-all"
                  onClick={() => { setQuestion(h.question); setAnswer(h.answer); setSources(h.sources || []); }}>
                  <div className="text-xs text-cat-yellow truncate">{h.question}</div>
                  <div className="text-xs text-gray-400 truncate mt-0.5">{h.answer?.slice(0, 80)}…</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
