import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, MessageSquare, Loader, BookOpen, AlertCircle } from 'lucide-react';
import { API } from '../api.js';

const QUICK_QUESTIONS = [
  'What is the maximum safe tilt angle?',
  'Engine is overheating, what do I do?',
  'How often should I change hydraulic oil?',
  'I feel tired, should I stop working?',
  'What is the fuel tank capacity?',
  'Worker was struck by the machine',
  'How do I check track tension?',
  'Pre-shift checklist steps?',
];

const SOURCE_LABELS = {
  '01_excavator_specs': 'Specs',
  '02_maintenance':     'Maintenance',
  '03_troubleshooting': 'Troubleshooting',
  '04_safety':          'Safety',
  '05_operator_health': 'Health',
  '06_operations':      'Operations',
  '07_emergency':       'Emergency',
  '08_attachments':     'Attachments',
};

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text.replace(/SAFETY ALERT[.:] ?/g, ''));
  utt.lang = 'en-US'; utt.rate = 0.92; utt.pitch = 1; utt.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const eng = voices.find(v => v.lang.startsWith('en') && v.name.includes('Female'))
           || voices.find(v => v.lang.startsWith('en')) || null;
  if (eng) utt.voice = eng;
  // 120ms delay prevents Chrome from cutting the first word
  setTimeout(() => window.speechSynthesis.speak(utt), 120);
}

export default function VoiceAgent({ operatorContext }) {
  const [question,  setQuestion]  = useState('');
  const [answer,    setAnswer]    = useState('');
  const [sources,   setSources]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [listening, setListening] = useState(false);
  const [ttsOn,     setTtsOn]     = useState(true);
  const [history,   setHistory]   = useState([]);
  const [sttError,  setSttError]  = useState('');
  const [sttAvail,  setSttAvail]  = useState(true);

  const recogRef = useRef(null);
  const ttsRef   = useRef(true);
  // Keep ttsRef in sync so STT closure always sees latest ttsOn
  useEffect(() => { ttsRef.current = ttsOn; }, [ttsOn]);

  // ── ask — stable reference via useCallback ───────────────────────────────
  const ask = useCallback(async (q) => {
    const text = (q || '').trim();
    if (!text) return;
    setLoading(true); setAnswer(''); setSources([]); setSttError('');
    try {
      const r = await fetch(`${API}/api/voice/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, operator_context: operatorContext || {} }),
      });
      const d = await r.json();
      const ans = d.answer || d.error || 'No response.';
      setAnswer(ans);
      setSources(d.sources || []);
      setHistory(h => [{ question: text, answer: ans, sources: d.sources || [] }, ...h.slice(0, 7)]);
      if (ttsRef.current) speak(ans);
    } catch {
      setAnswer('Cannot reach server. Is the backend running on port 5000?');
    }
    setLoading(false);
  }, [operatorContext]);

  // ── STT setup — re-runs when ask changes ─────────────────────────────────
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSttAvail(false); return; }
    const r = new SR();
    r.continuous = false; r.interimResults = false; r.lang = 'en-US';
    r.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setQuestion(t);
      setListening(false);
      ask(t);                     // ask now has stable reference — no stale closure
    };
    r.onerror = (e) => {
      setListening(false);
      const m = {
        'not-allowed': 'Mic permission denied — allow it in browser settings.',
        'no-speech':   'No speech detected. Try again.',
        'network':     'Network error during speech recognition.',
      };
      setSttError(m[e.error] || 'STT error: ' + e.error);
    };
    r.onend = () => setListening(false);
    recogRef.current = r;
  }, [ask]);

  // Pre-load TTS voices (Chrome lazy-loads them)
  useEffect(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  // ── toggleMic — with error handling ──────────────────────────────────────
  const toggleMic = () => {
    if (!recogRef.current) {
      setSttError('Speech recognition not available. Use Chrome or Edge.');
      return;
    }
    if (listening) {
      recogRef.current.stop();
      setListening(false);
    } else {
      setSttError('');
      try {
        recogRef.current.start();
        setListening(true);
      } catch {
        // Already started — abort and retry once
        recogRef.current.abort();
        setTimeout(() => {
          try { recogRef.current.start(); setListening(true); } catch {}
        }, 300);
      }
    }
  };

  const isSafety = answer.startsWith('SAFETY ALERT');

  return (
    <div className="cat-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-black/30 border-b border-cat-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-cat-yellow rounded-lg flex items-center justify-center">
            <MessageSquare size={13} className="text-black"/>
          </div>
          <span className="text-white font-semibold text-sm">CAT Voice Assistant</span>
          <span className="text-gray-600 text-xs hidden sm:block">RAG · BM25 · Qwen2.5:7b</span>
        </div>
        <button
          onClick={() => { setTtsOn(v => !v); window.speechSynthesis?.cancel(); }}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
            ttsOn ? 'border-cat-yellow text-cat-yellow bg-cat-yellow/10' : 'border-cat-border text-gray-500'
          }`}>
          {ttsOn ? <Volume2 size={11}/> : <VolumeX size={11}/>}
          {ttsOn ? ' TTS On' : ' TTS Off'}
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Answer */}
        {(answer || loading) && (
          <div className={`rounded-xl p-4 border ${isSafety ? 'bg-red-900/20 border-red-700' : 'bg-cat-darker border-cat-border'}`}>
            {loading
              ? <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Loader size={14} className="animate-spin text-cat-yellow"/> Searching knowledge base...
                </div>
              : <>
                  {isSafety && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full mb-2 inline-block">
                      SAFETY ALERT
                    </span>
                  )}
                  <p className={`text-sm leading-relaxed ${isSafety ? 'text-red-200' : 'text-white'}`}>
                    {answer.replace(/SAFETY ALERT[.:] ?/, '')}
                  </p>
                  {sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[...new Set(sources)].map(s => (
                        <span key={s} className="text-xs bg-cat-gray text-gray-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <BookOpen size={9}/> {SOURCE_LABELS[s] || s}
                        </span>
                      ))}
                    </div>
                  )}
                </>
            }
          </div>
        )}

        {/* STT error */}
        {sttError && (
          <div className="flex items-center gap-2 bg-orange-900/20 border border-orange-700 rounded-xl px-3 py-2 text-xs text-orange-300">
            <AlertCircle size={12}/> {sttError}
          </div>
        )}

        {/* Listening indicator */}
        {listening && (
          <div className="flex items-center gap-2 text-cat-yellow text-sm animate-pulse">
            <Mic size={14}/> Listening... speak now
          </div>
        )}

        {/* Input row */}
        <div className="flex gap-2">
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && ask(question)}
            placeholder="Ask about machinery, safety, maintenance..."
            className="cat-input flex-1"
          />
          <button
            onClick={toggleMic}
            title={sttAvail ? (listening ? 'Stop listening' : 'Voice input') : 'Chrome/Edge only'}
            className={`px-3 py-2.5 rounded-xl border transition-all flex-shrink-0 ${
              listening ? 'bg-red-600 border-red-500 animate-pulse' :
              sttAvail  ? 'bg-cat-gray border-cat-border hover:border-cat-yellow' :
                          'bg-cat-gray border-cat-border opacity-40 cursor-not-allowed'
            }`}>
            {listening
              ? <MicOff size={16} className="text-white"/>
              : <Mic    size={16} className={sttAvail ? 'text-gray-400' : 'text-gray-600'}/>}
          </button>
          <button
            onClick={() => ask(question)}
            disabled={loading || !question.trim()}
            className="cat-btn px-4 py-2.5 text-sm flex-shrink-0">
            {loading ? <Loader size={14} className="animate-spin"/> : 'Ask'}
          </button>
        </div>

        {/* Quick questions */}
        <div>
          <div className="text-gray-600 text-xs mb-2 uppercase tracking-wider">Quick questions</div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_QUESTIONS.map(q => (
              <button key={q} onClick={() => { setQuestion(q); ask(q); }}
                className="text-xs bg-cat-gray border border-cat-border text-gray-400 px-2.5 py-1.5 rounded-full hover:border-cat-yellow hover:text-cat-yellow transition-all">
                {q.length > 38 ? q.slice(0, 38) + '...' : q}
              </button>
            ))}
          </div>
        </div>

        {/* History */}
        {history.length > 1 && (
          <div>
            <div className="text-gray-600 text-xs mb-2 uppercase tracking-wider">Recent</div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {history.slice(1).map((h, i) => (
                <div key={i}
                  onClick={() => { setQuestion(h.question); setAnswer(h.answer); setSources(h.sources); }}
                  className="bg-cat-gray rounded-lg px-3 py-2 cursor-pointer hover:bg-cat-border transition-colors">
                  <div className="text-xs text-cat-yellow truncate">{h.question}</div>
                  <div className="text-xs text-gray-500 truncate mt-0.5">{h.answer?.slice(0, 70)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
