import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Volume2, Sparkles, AlertCircle, Bot, Check, CornerDownLeft } from 'lucide-react';
import { askVoiceAssistant } from '../api';

const QUICK_QUERIES = [
  'What is the maximum safe tilt angle?',
  'What is the fuel tank capacity?',
  'What is the safety exclusion zone for workers?',
  'Current task time and progress?',
];

export default function DriverVoiceCommand({ machineId = 'EXC001', currentTask }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [inputText, setInputText] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const recognitionRef = useRef(null);

  // Initialize Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognizer = new SpeechRecognition();
      recognizer.continuous = false;
      recognizer.interimResults = true;
      recognizer.lang = 'en-US';

      recognizer.onresult = (event) => {
        const text = Array.from(event.results)
          .map(r => r[0].transcript)
          .join('');
        setTranscript(text);
        setInputText(text);
      };

      recognizer.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setListening(false);
      };

      recognizer.onend = () => {
        setListening(false);
      };

      recognitionRef.current = recognizer;
    }
  }, []);

  const toggleListen = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please type your query directly.');
      return;
    }

    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      setTranscript('');
      setResponse(null);
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch (e) {
        console.warn('Recognition start error:', e);
      }
    }
  };

  const speakAnswer = (text) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleAsk = async (queryText) => {
    const q = (queryText || inputText || transcript).trim();
    if (!q) return;

    setLoading(true);
    setResponse(null);

    const context = {
      machine_id: machineId,
      task_type: currentTask?.task_type || 'Deep Trenching Pipeline B',
      estimated_time: currentTask?.estimated_time || 120,
    };

    const answer = await askVoiceAssistant(q, context);
    setResponse({ question: q, answer });
    setLoading(false);
    setInputText('');

    speakAnswer(answer);
  };

  return (
    <div className="bg-[#ffffff] border-t border-[#e6e6e1] p-4 shadow-2xl">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-4">
        {/* Large Push-to-Talk Voice Button (PRIMARY REQUIREMENT) */}
        <div className="flex items-center gap-3">
          <div className="relative">
            {listening && (
              <div className="absolute -inset-2 rounded-2xl bg-[#FFCD11] animate-ping opacity-40" />
            )}
            <button
              type="button"
              onClick={toggleListen}
              className={`relative z-10 px-5 py-3 rounded-2xl font-black text-sm flex items-center gap-2.5 transition-all shadow-xl ${
                listening
                  ? 'bg-red-600 text-white shadow-red-600/40 animate-pulse'
                  : 'bg-neutral-900 hover:bg-[#e0a218] text-white '
              }`}
            >
              {listening ? <MicOff size={18} /> : <Mic size={18} />}
              <span>{listening ? 'LISTENING (PUSH TO STOP)' : 'PUSH TO TALK'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className={`p-2.5 rounded-xl border text-xs flex items-center gap-1.5 transition ${
              ttsEnabled
                ? 'bg-[#f0f0ec] border-emerald-500/40 text-emerald-600'
                : 'bg-[#f0f0ec] border-[#e6e6e1] text-neutral-500'
            }`}
            title={ttsEnabled ? 'Cab Audio Feedback Active' : 'Cab Audio Feedback Muted'}
          >
            <Volume2 size={15} />
            <span className="hidden sm:inline">{ttsEnabled ? 'Audio ON' : 'Audio OFF'}</span>
          </button>
        </div>

        {/* Input Text Form + Quick Suggestions */}
        <div className="flex-1 w-full space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={listening ? 'Listening to cab microphone...' : 'Ask question (e.g. "What is safe tilt angle?", "Fuel capacity?")...'}
                className="w-full bg-[#f0f0ec] border border-[#e6e6e1] focus:border-[#FFCD11] text-neutral-800 placeholder-neutral-500 text-xs rounded-xl px-3.5 py-2.5 outline-none transition"
              />
              {transcript && (
                <span className="absolute right-3 top-2.5 text-[10px] text-neutral-900 font-mono">
                  LIVE MIC
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || (!inputText && !transcript)}
              className="bg-[#f0f0ec] hover:bg-[#e0e0da] text-neutral-900 p-2.5 rounded-xl border border-[#e6e6e1] transition disabled:opacity-40"
            >
              <Send size={15} />
            </button>
          </form>

          {/* Quick Query Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-neutral-500 uppercase font-semibold">Quick Ask:</span>
            {QUICK_QUERIES.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setInputText(q);
                  handleAsk(q);
                }}
                className="text-[10px] bg-[#f0f0ec] hover:bg-[#f0f0ec] text-neutral-700 hover:text-neutral-900 px-2 py-0.5 rounded-md border border-[#e6e6e1] transition truncate max-w-[210px]"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Answer Modal / Toast Display */}
      {response && (
        <div className="max-w-6xl mx-auto mt-3 bg-[#f0f0ec] border border-[#FFCD11]/40 rounded-xl p-3 shadow-xl animate-fade-in flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#FFCD11]/20 border border-[#FFCD11]/40 text-neutral-900 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot size={15} />
            </div>
            <div>
              <div className="text-[11px] font-bold text-neutral-900 mb-0.5">
                Q: "{response.question}"
              </div>
              <div className="text-xs text-neutral-800 leading-relaxed font-sans">
                {response.answer}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setResponse(null)}
            className="text-neutral-500 hover:text-neutral-900 text-xs px-2 py-1 rounded"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
