import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, MessageSquare, Loader, BookOpen, AlertCircle, Radio } from 'lucide-react';
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
  setTimeout(() => window.speechSynthesis.speak(utt), 120);
}

async function transcribeWithWhisper(blob) {
  const form = new FormData();
  form.append('audio', blob, 'recording.webm');
  const r = await fetch(`${API}/api/whisper/transcribe`, { method: 'POST', body: form });
  const d = await r.json();
  if (!d.ok) throw new Error(d.error || 'Whisper failed');
  return d.transcript;
}

export default function VoiceAgent({ operatorContext }) {
  const [question,     setQuestion]     = useState('');
  const [answer,       setAnswer]       = useState('');
  const [sources,      setSources]      = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [listening,    setListening]    = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [ttsOn,        setTtsOn]        = useState(true);
  const [history,      setHistory]      = useState([]);
  const [sttError,     setSttError]     = useState('');
  const [whisperMode,  setWhisperMode]  = useState(true);

  const mediaRecRef = useRef(null);
  const chunksRef   = useRef([]);
  const recogRef    = useRef(null);
  const ttsRef      = useRef(true);
  useEffect(() => { ttsRef.current = ttsOn; }, [ttsOn]);

  // Pre-load TTS voices
  useEffect(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  // ── ask ──────────────────────────────────────────────────────────────────
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

  // ── Web Speech setup ──────────────────────────────────────────────────────
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = false; r.interimResults = false; r.lang = 'en-US';
    r.onresult = (e) => { const t = e.results[0][0].transcript; setQuestion(t); setListening(false); ask(t); };
    r.onerror  = (e) => {
      setListening(false);
      const m = { 'not-allowed': 'Mic denied.', 'no-speech': 'No speech.', 'network': 'Network error — switch to Whisper mode.' };
      setSttError(m[e.error] || 'STT: ' + e.error);
    };
    r.onend = () => setListening(false);
    recogRef.current = r;
  }, [ask]);

  // ── Whisper mic (hold to record, release to transcribe) ──────────────────
  const toggleWhisperMic = async () => {
    if (listening) {
      mediaRecRef.current?.stop();
      return;
    }
    setSttError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const rec = new MediaRecorder(stream, { mimeType });
      rec.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setListening(false);
        setTranscribing(true);
        try {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const text = await transcribeWithWhisper(blob);
          setQuestion(text);
          ask(text);
        } catch (e) {
          setSttError('Whisper: ' + e.message);
        }
        setTranscribing(false);
      };
      mediaRecRef.current = rec;
      rec.start();
      setListening(true);
    } catch (e) {
      setSttError('Mic access denied: ' + e.message);
    }
  };

  // ── Web Speech mic ────────────────────────────────────────────────────────
  const toggleWebSpeechMic = () => {
    if (!recogRef.current) { setSttError('Use Chrome/Edge for Web Speech. Or switch to Whisper.'); return; }
    if (listening) { recogRef.current.stop(); setListening(false); }
    else {
      setSttError('');
      try { recogRef.current.start(); setListening(true); }
      catch { recogRef.current.abort(); setTimeout(() => { try { recogRef.current.start(); setListening(true); } catch {} }, 300); }
    }
  };

  const toggleMic = whisperMode ? toggleWhisperMic : toggleWebSpeechMic;
  const isSafety  = answer.startsWith('SAFETY ALERT');

  return (
    <div className="cat-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-black/30 border-b border-cat-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-cat-yellow rounded-lg flex items-center justify-center">
            <MessageSquare size={13} className="text-black"/>
          </div>
          <span className="text-white font-semibold text-sm">CAT Voice Assistant</span>
          <span className="text-gray-600 text-xs hidden sm:block">
            {whisperMode ? 'Whisper STT' : 'Web Speech'} · RAG · Qwen2.5:7b
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setWhisperMode(v => !v); setSttError(''); if (listening) { mediaRecRef.current?.stop(); recogRef.current?.stop(); } }}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-all ${
              whisperMode ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-cat-border text-gray-400 hover:border-cat-yellow'
            }`}>
            <Radio size={10}/> {whisperMode ? 'Whisper' : 'WebSpeech'}
          </button>
          <button onClick={() => { setTtsOn(v => !v); window.speechSynthesis?.cancel(); }}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
              ttsOn ? 'border-cat-yellow text-cat-yellow bg-cat-yellow/10' : 'border-cat-border text-gray-500'
            }`}>
            {ttsOn ? <Volume2 size={11}/> : <VolumeX size={11}/>}
            {ttsOn ? ' TTS' : ' Mute'}
          </button>
        </div>
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
                  {isSafety && <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full mb-2 inline-block">SAFETY ALERT</span>}
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

        {/* Status */}
        {sttError && (
          <div className="flex items-center gap-2 bg-orange-900/20 border border-orange-700 rounded-xl px-3 py-2 text-xs text-orange-300">
            <AlertCircle size={12}/> {sttError}
          </div>
        )}
        {listening && !transcribing && (
          <div className="flex items-center gap-2 text-red-400 text-sm animate-pulse">
            <Mic size={14}/> {whisperMode ? 'Recording… click mic again to stop & transcribe' : 'Listening… speak now'}
          </div>
        )}
        {transcribing && (
          <div className="flex items-center gap-2 text-cat-yellow text-sm animate-pulse">
            <Loader size={14} className="animate-spin"/> Transcribing with Whisper...
          </div>
        )}

        {/* Input row */}
        <div className="flex gap-2">
          <input value={question} onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && ask(question)}
            placeholder="Ask about machinery, safety, maintenance..."
            className="cat-input flex-1"/>
          <button onClick={toggleMic} disabled={transcribing}
            className={`px-3 py-2.5 rounded-xl border transition-all flex-shrink-0 ${
              listening    ? 'bg-red-600 border-red-500 animate-pulse' :
              transcribing ? 'bg-cat-gray border-cat-border opacity-50 cursor-not-allowed' :
                             'bg-cat-gray border-cat-border hover:border-cat-yellow'
            }`}>
            {listening ? <MicOff size={16} className="text-white"/> : <Mic size={16} className="text-gray-400"/>}
          </button>
          <button onClick={() => ask(question)} disabled={loading || !question.trim()}
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
                <div key={i} onClick={() => { setQuestion(h.question); setAnswer(h.answer); setSources(h.sources); }}
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
