import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, X, Bot } from 'lucide-react';
import { askVoiceAssistant, API_BASE } from '../api';
import { createVoiceListener, transcribeWav } from '../services/voiceListener';
import { logEvent, LOG_CATEGORIES, LOG_SEVERITY } from '../services/logger';

// "Hey Cat" wake phrase (Whisper sometimes writes "cat" as kat/cad/cap/cats...)
const WAKE_RE = /\b(?:hey|hay|hi|hai|hello|okay|ok)[\s,.!-]+(?:cat|cats|kat|kit|kate|cad|cap|cut|cot|caterpillar)\b[\s,.!?]*/gi;
const AWAKE_TIMEOUT_MS = 8000;   // woke with no command / after an answer (follow-up window) → back to idle

function beep() {
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)();
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.value = 880; g.gain.value = 0.08;
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + 0.12);
    o.onended = () => c.close();
  } catch {}
}

function speak(text, onDone) {
  let done = false;
  const finish = () => { if (!done) { done = true; onDone?.(); } };
  if (!window.speechSynthesis) return finish();
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text.replace(/SAFETY ALERT[.:] ?/g, ''));
  utt.rate = 1.05; utt.pitch = 1.0;
  utt.onend = finish; utt.onerror = finish;
  setTimeout(finish, 3000 + text.length * 90);   // Chrome sometimes never fires onend
  window.speechSynthesis.speak(utt);
}

// text after the last "Hey Cat" in `text`, or null if the wake phrase isn't there
function afterWake(text) {
  let last = null, m;
  const re = new RegExp(WAKE_RE.source, 'gi');
  while ((m = re.exec(text))) last = m;
  return last ? text.slice(last.index + last[0].length).trim() : null;
}

export default function FloatingVoiceButton({
  machineId = 'EXC001',
  currentTaskName = 'Deep Trenching Pipeline B',
  onAsk,            // (question) => answer string — the same assistant the AI Assistant tab uses
}) {
  const [enabled, setEnabled]       = useState(true);    // hands-free "Hey Cat"
  const [phase, setPhase]           = useState('off');   // off | idle | awake | thinking | speaking
  const [hearing, setHearing]       = useState(false);   // someone is talking right now
  const [busyStt, setBusyStt]       = useState(false);   // Whisper is transcribing
  const [heard, setHeard]           = useState('');      // last transcript (live STT display)
  const [lastAnswer, setLastAnswer] = useState(null);
  const [showToast, setShowToast]   = useState(false);
  const [error, setError]           = useState('');

  const listenerRef = useRef(null);
  const levelRef    = useRef(null);
  const phaseRef    = useRef('off');
  const awakeTimer  = useRef(null);
  const queueRef    = useRef(Promise.resolve());
  const propsRef    = useRef({ machineId, currentTaskName, onAsk });
  propsRef.current = { machineId, currentTaskName, onAsk };

  const setPhaseBoth = (p) => { phaseRef.current = p; setPhase(p); };

  const goAwake = () => {
    setPhaseBoth('awake');
    clearTimeout(awakeTimer.current);
    awakeTimer.current = setTimeout(() => { if (phaseRef.current === 'awake') { setPhaseBoth('idle'); setHeard(''); } }, AWAKE_TIMEOUT_MS);
  };

  const askRef = useRef(null);
  askRef.current = async (question) => {
    clearTimeout(awakeTimer.current);
    listenerRef.current?.setPaused(true);        // mic off while thinking/speaking
    setPhaseBoth('thinking'); setHeard(''); setShowToast(true);
    setLastAnswer({ question, answer: null });
    logEvent(LOG_CATEGORIES.VOICE, `Driver queried: "${question}"`, LOG_SEVERITY.INFO);
    let answer;
    try {
      answer = propsRef.current.onAsk
        ? await propsRef.current.onAsk(question)
        : await askVoiceAssistant(question, { machine_id: propsRef.current.machineId, task_type: propsRef.current.currentTaskName });
    } catch {
      answer = "Sorry, I couldn't get an answer for that. Please ask again.";
    }
    logEvent(LOG_CATEGORIES.VOICE, `AI Assistant response: "${answer.slice(0, 90)}..."`, LOG_SEVERITY.INFO);
    setLastAnswer({ question, answer });
    setPhaseBoth('speaking');
    speak(answer, () => {
      if (phaseRef.current === 'off') return;
      listenerRef.current?.setPaused(false);
      goAwake();   // follow-up window: next thing you say is a question, no "Hey Cat" needed
    });
  };

  const handleUtterance = async (blob) => {
    if (phaseRef.current !== 'idle' && phaseRef.current !== 'awake') return;
    setBusyStt(true);
    let text = '';
    try {
      text = await transcribeWav(API_BASE, blob);
      setError('');
    } catch (e) {
      setError(`Whisper: ${e.message}. Is whisper_server.py running?`);
    }
    setBusyStt(false);
    if (!text || (phaseRef.current !== 'idle' && phaseRef.current !== 'awake')) return;
    setHeard(text);

    const cmd = afterWake(text);
    if (phaseRef.current === 'idle') {
      if (cmd === null) return;                       // not for us
      beep();
      if (cmd) return askRef.current(cmd);            // "Hey Cat, what is the fuel level?"
      goAwake();                                      // just "Hey Cat" — wait for the question
    } else {
      askRef.current(cmd ?? text);                    // awake: this utterance is the question
    }
  };
  const handleRef = useRef(handleUtterance);
  handleRef.current = handleUtterance;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const listener = createVoiceListener({
      onSpeechStart: () => setHearing(true),
      onSpeechEnd: () => setHearing(false),
      onLevel: (rms, th) => { levelRef.current?.style.setProperty('--lvl', Math.min(1, rms / (th * 2)).toFixed(2)); },
      onUtterance: (blob) => {
        queueRef.current = queueRef.current.then(() => handleRef.current(blob)).catch(() => {});   // keep utterances in order
      },
    });
    listenerRef.current = listener;
    (async () => {
      try {
        const h = await fetch(`${API_BASE}/api/whisper/health`).then(r => r.json()).catch(() => null);
        if (!h?.ok) setError('Whisper server not running — start it with: python whisper_server.py');
        await listener.start();
        if (cancelled) { listener.stop(); return; }
        setPhaseBoth('idle');
      } catch (e) {
        setError(e.name === 'NotAllowedError' ? 'Microphone blocked — allow it to use "Hey Cat".' : `Mic error: ${e.message}`);
        setEnabled(false);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(awakeTimer.current);
      listener.stop();
      listenerRef.current = null;
      window.speechSynthesis?.cancel();
      setPhaseBoth('off'); setHearing(false); setBusyStt(false); setHeard('');
    };
  }, [enabled]);

  const active = phase === 'awake' || (phase === 'idle' && hearing);
  const label =
    phase === 'thinking' ? 'THINKING…' :
    phase === 'speaking' ? 'SPEAKING…' :
    phase === 'awake'    ? (hearing ? 'LISTENING…' : busyStt ? 'TRANSCRIBING…' : 'GO AHEAD…') :
    phase === 'idle'     ? (hearing ? 'HEARING…' : busyStt ? 'TRANSCRIBING…' : 'SAY "HEY CAT"') :
                           'HEY CAT OFF';

  return (
    <>
      {/* Response Floating Toast / Bubble */}
      {showToast && lastAnswer && (
        <div className="fixed bottom-20 right-6 z-50 max-w-md w-full bg-[#f0f0ec] border-2 border-[#FFCD11] rounded-2xl p-4 shadow-2xl shadow-black/10 animate-slide-up">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#FFCD11]/20 border border-[#FFCD11]/40 text-neutral-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot size={16} />
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-neutral-600">
                  {lastAnswer.answer === null ? (
                    <span className="text-neutral-900 animate-pulse">Processing voice query...</span>
                  ) : (
                    <span>Q: "{lastAnswer.question}"</span>
                  )}
                </div>
                <div className="text-xs text-neutral-900 leading-relaxed font-sans font-medium">
                  {lastAnswer.answer === null ? 'Analyzing manuals & telemetry...' : lastAnswer.answer}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowToast(false)}
              className="text-neutral-600 hover:text-neutral-900 p-1 rounded-lg"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Live STT display while the agent is awake or hearing speech */}
      {!showToast && enabled && (phase === 'awake' || heard || hearing || busyStt) && phase !== 'thinking' && phase !== 'speaking' && (
        <div className={`fixed bottom-20 right-6 z-50 max-w-md w-full bg-[#f0f0ec] border-2 rounded-2xl p-4 shadow-2xl shadow-black/10 ${phase === 'awake' ? 'border-red-500' : 'border-black/10'}`}>
          <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${phase === 'awake' ? 'text-red-600 animate-pulse' : 'text-neutral-500'}`}>
            {phase === 'awake' ? 'Listening' : 'Heard'}
          </div>
          <div className="text-sm text-neutral-900 min-h-[1.25rem]">
            {heard || <span className="text-neutral-500">{phase === 'awake' ? 'Go ahead…' : '…'}</span>}
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-36 right-6 z-50 max-w-xs bg-[#f0f0ec] border border-orange-500 rounded-xl px-3 py-2 text-xs text-orange-700">
          {error}
        </div>
      )}

      {/* Hands-free "Hey Cat" pill — click to turn the wake word on/off */}
      <div className="fixed bottom-6 right-6 z-50 select-none">
        <button
          type="button"
          onClick={() => { setError(''); setEnabled(v => !v); }}
          title='Hands-free: say "Hey Cat". Click to turn on/off.'
          className={`flex items-center gap-3 px-5 py-3.5 rounded-full font-black text-xs md:text-sm tracking-wide shadow-2xl transition-all active:scale-95 ${
            active
              ? 'bg-red-600 text-white shadow-red-600/60 ring-4 ring-red-400/40 animate-pulse'
              : enabled
                ? 'bg-neutral-900 hover:bg-[#e0a218] text-white shadow-[0_0_25px_rgba(255,205,17,0.4)]'
                : 'bg-[#f0f0ec] text-neutral-600 border border-black/10'
          }`}
        >
          <div className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center">
            {enabled ? <Mic size={16} /> : <MicOff size={16} />}
          </div>
          <span>{label}</span>
        </button>
        {/* mic level: moves when the mic is picking you up */}
        {enabled && (
          <div ref={levelRef} className="mt-1.5 mx-3 h-1 rounded-full bg-black/10 overflow-hidden" title="Mic level">
            <div className="h-full bg-green-500 transition-[width] duration-75" style={{ width: 'calc(var(--lvl, 0) * 100%)' }} />
          </div>
        )}
      </div>
    </>
  );
}
