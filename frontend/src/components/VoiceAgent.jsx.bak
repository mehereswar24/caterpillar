import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, MessageSquare, Loader, BookOpen } from 'lucide-react';
import { API } from '../api.js';

const QUICK_QUESTIONS = [
  'What is the maximum safe tilt angle?',
  'Engine is overheating, what do I do?',
  'How often should I change hydraulic oil?',
  'I feel tired, should I stop working?',
  'Pre-shift checklist steps?',
  'What is the fuel tank capacity?',
  'Worker was struck by the machine',
  'How do I check track tension?',
];

const SOURCE_LABELS = {
  '01_excavator_specs':  '📋 Specs',
  '02_maintenance':      '🔧 Maintenance',
  '03_troubleshooting':  '⚠️ Troubleshooting',
  '04_safety':           '🛡 Safety',
  '05_operator_health':  '❤️ Health',
  '06_operations':       '⚙️ Operations',
  '07_emergency':        '🚨 Emergency',
  '08_attachments':      '🪝 Attachments',
  'excavator_specs':     '📋 Specs',
  'maintenance':         '🔧 Maintenance',
  'troubleshooting':     '⚠️ Troubleshooting',
};

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.92; utt.pitch = 1; utt.volume = 1;
  window.speechSynthesis.speak(utt);
}

export default function VoiceAgent({ operatorContext }) {
  const [question,  setQuestion]  = useState('');
  const [answer,    setAnswer]    = useState('');
  const [sources,   setSources]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [listening, setListening] = useState(false);
  const [ttsOn,     setTtsOn]     = useState(true);
  const [history,   setHistory]   = useState([]);
  const recogRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = false; r.interimResults = false; r.lang = 'en-US';
    r.onresult = e => { const t = e.results[0][0].transcript; setQuestion(t); setListening(false); ask(t); };
    r.onerror = () => setListening(false);
    r.onend   = () => setListening(false);
    recogRef.current = r;
  }, []);

  const ask = async (q) => {
    const text = q || question;
    if (!text.trim()) return;
    setLoading(true); setAnswer(''); setSources([]);
    try {
      const r = await fetch(`${API}/api/voice/ask`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ question: text, operator_context: operatorContext || {} }),
      });
      const d = await r.json();
      setAnswer(d.answer || d.error || 'No response.');
      setSources(d.sources || []);
      setHistory(h => [{ question:text, answer:d.answer, sources:d.sources||[] }, ...h.slice(0,7)]);
      if (ttsOn && d.answer) speak(d.answer);
    } catch (e) {
      setAnswer(`Could not reach server: ${e.message}`);
    }
    setLoading(false);
  };

  const toggleMic = () => {
    if (!recogRef.current) return;
    if (listening) { recogRef.current.stop(); setListening(false); }
    else { recogRef.current.start(); setListening(true); }
  };

  const isSafetyAlert = answer.startsWith('SAFETY ALERT');
  const uniqueSources = [...new Set(sources)];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-cat-yellow rounded-lg flex items-center justify-center flex-shrink-0">
            <MessageSquare size={13} className="text-black"/>
          </div>
          <span className="text-white font-semibold text-sm">CAT Voice Assistant</span>
          <span className="text-gray-500 text-xs">RAG · BM25+TF-IDF · Qwen2.5:7b</span>
        </div>
        <button onClick={() => setTtsOn(v => !v)}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${ttsOn?'border-cat-yellow text-cat-yellow bg-cat-yellow/10':'border-gray-700 text-gray-500'}`}>
          {ttsOn ? <Volume2 size={11}/> : <VolumeX size={11}/>}
          {ttsOn ? 'Voice On' : 'Voice Off'}
        </button>
      </div>

      <div className="p-5">
        {/* Answer display */}
        {(answer || loading) && (
          <div className={`rounded-xl p-4 mb-4 border ${isSafetyAlert?'bg-red-900/20 border-red-700':loading?'bg-gray-800 border-gray-700':'bg-gray-800 border-gray-700'}`}>
            {loading
              ? <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Loader size={14} className="animate-spin text-cat-yellow"/>
                  Searching knowledge base...
                </div>
              : <>
                  {isSafetyAlert && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">⚠ SAFETY ALERT</span>
                    </div>
                  )}
                  <p className={`text-sm leading-relaxed ${isSafetyAlert?'text-red-200':'text-white'}`}>{answer.replace('SAFETY ALERT. ','').replace('SAFETY ALERT:','')}</p>
                  {uniqueSources.length > 0 && (
                    <div className="mt-2.5 flex gap-1.5 flex-wrap">
                      {uniqueSources.map(s => (
                        <span key={s} className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <BookOpen size={9}/> {SOURCE_LABELS[s] || s}
                        </span>
                      ))}
                    </div>
                  )}
                </>
            }
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2 mb-4">
          <input value={question} onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key==='Enter' && ask()}
            placeholder="Ask about machinery, safety, maintenance, health..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cat-yellow transition-colors"/>
          <button onClick={toggleMic}
            className={`px-3 py-2.5 rounded-xl border transition-all ${listening?'bg-red-600 border-red-500 animate-pulse':'bg-gray-800 border-gray-700 hover:border-cat-yellow'}`}>
            {listening ? <MicOff size={16} className="text-white"/> : <Mic size={16} className="text-gray-400"/>}
          </button>
          <button onClick={() => ask()} disabled={loading || !question.trim()}
            className="bg-cat-yellow text-black font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-yellow-400 transition-all disabled:opacity-40">
            Ask
          </button>
        </div>

        {/* Quick questions */}
        <div className="mb-4">
          <div className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Quick questions</div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_QUESTIONS.map(q => (
              <button key={q} onClick={() => { setQuestion(q); ask(q); }}
                className="text-xs bg-gray-800 border border-gray-700 text-gray-400 px-2.5 py-1.5 rounded-full hover:border-cat-yellow hover:text-cat-yellow transition-all">
                {q.length > 35 ? q.slice(0,35)+'…' : q}
              </button>
            ))}
          </div>
        </div>

        {/* History */}
        {history.length > 1 && (
          <div>
            <div className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Recent</div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {history.slice(1).map((h,i) => (
                <div key={i} onClick={() => { setQuestion(h.question); setAnswer(h.answer); setSources(h.sources); }}
                  className="bg-gray-800 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-700 transition-colors">
                  <div className="text-xs text-cat-yellow truncate">{h.question}</div>
                  <div className="text-xs text-gray-500 truncate mt-0.5">{h.answer?.slice(0,60)}…</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
