import React, { useState } from 'react';
import { Mic, MicOff, Waves } from 'lucide-react';

export default function VoiceBar() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');

  const toggleMic = async () => {
    if (!listening) {
      setListening(true);
      setTranscript('Listening...');
      setResponse('');
      
      setTimeout(async () => {
        setTranscript('how long will this trench take?');
        try {
          const res = await fetch('https://caterpillar-stack.onrender.com/voice/respond', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              transcript: 'how long will this trench take?',
              operator_id: 'OP001',
              machine_id: 'EXC001'
            })
          });
          const data = await res.json();
          setResponse(data.speech_text);
        } catch (e) {
          setResponse('Estimated 52 minutes. (Mock fallback)');
        }
        setListening(false);
      }, 1500);
    } else {
      setListening(false);
      setTranscript('');
    }
  };

  return (
    <div className={"relative transition-all duration-500 rounded-3xl p-1 bg-gradient-to-r " + (listening ? 'from-cat-yellow via-orange-500 to-cat-yellow animate-pulse shadow-[0_0_30px_rgba(255,184,28,0.4)]' : 'from-white/10 to-white/5 border border-white/10 shadow-2xl')}>
      <div className="bg-[#111] rounded-[22px] p-4 flex items-center gap-5">
        <button 
          onClick={toggleMic}
          className={"relative p-4 rounded-full transition-all duration-300 flex items-center justify-center overflow-hidden group " + (listening ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-cat-yellow text-black hover:bg-yellow-400 shadow-[0_0_15px_rgba(255,184,28,0.5)]')}
        >
          {listening ? <MicOff size={24} className="relative z-10" /> : <Mic size={24} className="relative z-10" />}
          {listening && (
            <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20"></div>
          )}
        </button>
        <div className="flex-1 py-1">
          <div className="flex items-center gap-2 text-cat-yellow text-xs font-bold tracking-widest uppercase mb-1">
            {listening ? <Waves size={14} className="animate-pulse" /> : null}
            {listening ? 'Voice Active' : 'Hey CAT'}
          </div>
          <div className={"text-lg font-medium transition-colors " + (listening ? 'text-gray-300' : 'text-white')}>
            {response || transcript || 'Tap microphone to speak command...'}
          </div>
        </div>
      </div>
    </div>
  );
}
