import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, Sparkles, X, Bot } from 'lucide-react';
import { askVoiceAssistant } from '../api';
import { logEvent, LOG_CATEGORIES, LOG_SEVERITY } from '../services/logger';

export default function FloatingVoiceButton({
  machineId = 'EXC001',
  currentTaskName = 'Deep Trenching Pipeline B',
}) {
  const [isPressing, setIsPressing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [lastAnswer, setLastAnswer] = useState(null);
  const [showToast, setShowToast] = useState(false);

  const recognitionRef = useRef(null);
  const transcriptBufferRef = useRef('');

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognizer = new SpeechRecognition();
      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.lang = 'en-US';

      recognizer.onresult = (event) => {
        const text = Array.from(event.results)
          .map(r => r[0].transcript)
          .join('');
        transcriptBufferRef.current = text;
        setTranscript(text);
      };

      recognizer.onerror = (e) => {
        console.warn('Speech recognition error:', e.error);
      };

      recognitionRef.current = recognizer;
    }
  }, []);

  const startHold = (e) => {
    e.preventDefault();
    setIsPressing(true);
    setTranscript('');
    transcriptBufferRef.current = '';
    setShowToast(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {}
    }
  };

  const endHold = async (e) => {
    e.preventDefault();
    if (!isPressing) return;
    setIsPressing(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {}
    }

    const question = transcriptBufferRef.current.trim() || 'What is the nearest fuel station?';
    setProcessing(true);
    setShowToast(true);

    logEvent(LOG_CATEGORIES.VOICE, `Driver queried: "${question}"`, LOG_SEVERITY.INFO);

    const answer = await askVoiceAssistant(question, {
      machine_id: machineId,
      task_type: currentTaskName,
    });

    logEvent(LOG_CATEGORIES.VOICE, `AI Assistant response: "${answer.slice(0, 90)}..."`, LOG_SEVERITY.INFO);

    setLastAnswer({ question, answer });
    setProcessing(false);

    // Speak response through cab audio
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(answer);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <>
      {/* Response Floating Toast / Bubble */}
      {showToast && (
        <div className="fixed bottom-20 right-6 z-50 max-w-md w-full bg-[#181818] border-2 border-[#FFB81C] rounded-2xl p-4 shadow-2xl shadow-black/80 animate-slide-up">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#FFB81C]/20 border border-[#FFB81C]/40 text-[#FFB81C] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot size={16} />
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-gray-400">
                  {processing ? (
                    <span className="text-[#FFB81C] animate-pulse">Processing voice query...</span>
                  ) : (
                    <span>Q: "{lastAnswer?.question}"</span>
                  )}
                </div>
                <div className="text-xs text-white leading-relaxed font-sans font-medium">
                  {processing ? 'Analyzing manuals & telemetry...' : lastAnswer?.answer}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowToast(false)}
              className="text-gray-400 hover:text-white p-1 rounded-lg"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Floating Push-and-Hold Voice Pill */}
      <div className="fixed bottom-6 right-6 z-50 select-none">
        <button
          type="button"
          onMouseDown={startHold}
          onMouseUp={endHold}
          onTouchStart={startHold}
          onTouchEnd={endHold}
          className={`flex items-center gap-3 px-5 py-3.5 rounded-full font-black text-xs md:text-sm tracking-wide shadow-2xl transition-all active:scale-95 ${
            isPressing
              ? 'bg-red-600 text-white shadow-red-600/60 ring-4 ring-red-400/40 animate-pulse'
              : 'bg-[#FFB81C] hover:bg-[#e0a218] text-black shadow-[0_0_25px_rgba(255,184,28,0.4)]'
          }`}
        >
          <div className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center">
            {isPressing ? <MicOff size={16} /> : <Mic size={16} />}
          </div>
          <span>
            {isPressing ? (transcript ? `"${transcript.slice(0, 20)}..."` : 'HOLD TO TALK...') : '🎙 HOLD TO TALK'}
          </span>
        </button>
      </div>
    </>
  );
}
