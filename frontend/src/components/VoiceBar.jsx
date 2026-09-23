import React, { useState } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

const API = 'http://localhost:8000';

const DEMO_QUERIES = [
  'how long will this trench take?',
  'what is my safety score today?',
  'am I idling too much?',
  'when is my next service due?',
  'what is the weather doing?',
  'start pre-shift check',
  'log an incident — worker too close',
];

export default function VoiceBar() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [skillId, setSkillId] = useState('');
  const [loading, setLoading] = useState(false);

  const sendQuery = async (query) => {
    setTranscript(query);
    setResponse('');
    setSkillId('');
    setLoading(true);
    try {
      const r = await fetch(`${API}/voice/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: query, operator_id: 'OP001', machine_id: 'EXC001' }),
      });
      const d = await r.json();
      setResponse(d.speech_text || 'No response.');
      setSkillId(d.skill_id || '');

      // Browser TTS
      if ('speechSynthesis' in window && d.speech_text) {
        const utt = new SpeechSynthesisUtterance(d.speech_text);
        utt.rate = 1.0; utt.pitch = 1.0;
        window.speechSynthesis.speak(utt);
      }
    } catch {
      setResponse('Estimated 52 minutes. (offline fallback)');
    }
    setLoading(false);
    setListening(false);
  };

  const toggleMic = async () => {
    if (listening) { setListening(false); return; }

    // Try Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SR();
      rec.lang = 'en-US';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      setListening(true);
      setTranscript('Listening…');
      rec.onresult = (e) => {
        const text = e.results[0][0].transcript;
        sendQuery(text);
      };
      rec.onerror = () => {
        setListening(false);
        setTranscript('');
      };
      rec.start();
    } else {
      // Cycle through demo queries
      setListening(true);
      const q = DEMO_QUERIES[Math.floor(Math.random() * DEMO_QUERIES.length)];
      await sendQuery(q);
    }
  };

  return (
    <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 shadow-2xl">
      {/* Demo quick-tap queries */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {DEMO_QUERIES.slice(0, 5).map(q => (
          <button key={q} onClick={() => sendQuery(q)}
            className="text-xs bg-gray-700 hover:bg-cat-yellow hover:text-black text-gray-300 px-2.5 py-1 rounded-full transition">
            {q}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button onClick={toggleMic}
          className={`p-4 rounded-full transition ${listening ? 'bg-red-500 animate-pulse' : 'bg-cat-yellow text-black hover:bg-yellow-400'}`}>
          {listening ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="text-gray-400 text-sm truncate">
            {transcript || 'Say "Hey CAT" or tap a query above'}
          </div>
          {skillId && (
            <div className="text-xs text-cat-yellow mt-0.5">
              Skill: {skillId}
            </div>
          )}
          {loading
            ? <div className="text-gray-400 animate-pulse mt-1">Thinking…</div>
            : response && (
              <div className="text-white font-medium mt-1 leading-snug">{response}</div>
            )}
        </div>

        {response && (
          <button onClick={() => {
            const utt = new SpeechSynthesisUtterance(response);
            window.speechSynthesis?.speak(utt);
          }} className="text-gray-400 hover:text-white p-2 rounded transition">
            <Volume2 size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
