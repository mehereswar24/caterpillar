import React, { useState } from 'react';
import { Bot, Send, User, Sparkles, Volume2, BookOpen, HelpCircle } from 'lucide-react';
import { askVoiceAssistant } from '../api';
import { logEvent, LOG_CATEGORIES, LOG_SEVERITY } from '../services/logger';

const RECOMMENDED_QUESTIONS = [
  'What is the maximum safe tilt angle on a slope?',
  'What is our fuel tank capacity and burn rate?',
  'What is the exclusion zone radius around the excavator?',
  'What should I do if the engine temperature exceeds 95°C?',
  'How often should hydraulic return filters be replaced?',
  'What is the emergency procedure for underground gas line contact?',
];

export default function AiAssistantView({ machineId = 'CAT 320 • EXC001', onAsk }) {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: `Hello Rajan. I am your CAT SmartOperator cab co-pilot. I have full access to the 8 official CAT 320 technical manuals, specs, and real-time site telemetry. How can I assist your operation today?`,
      time: '11:45 AM',
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (queryText) => {
    const q = (queryText || input).trim();
    if (!q) return;

    const userMsg = { sender: 'user', text: q, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    logEvent(LOG_CATEGORIES.VOICE, `AI Terminal query: "${q}"`, LOG_SEVERITY.INFO);

    let answer;
    try { answer = onAsk ? await onAsk(q) : await askVoiceAssistant(q, { machine_id: machineId }); }
    catch { answer = "Sorry, I couldn't get an answer for that. Please ask again."; }
    const aiMsg = { sender: 'ai', text: answer, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, aiMsg]);
    setLoading(false);

    // Audio output
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(answer);
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Title */}
      <div className="pb-3 border-b border-[#e6e6e1]">
        <div className="flex items-center gap-2 mb-1">
          <Bot size={20} className="text-neutral-900" />
          <h1 className="text-xl font-black text-neutral-900 uppercase tracking-tight">
            CAT AI Cab Assistant (RAG Knowledge Engine)
          </h1>
        </div>
        <p className="text-xs text-neutral-600">
          Powered by embedded CAT 320 Field Service Manuals and safety procedures.
        </p>
      </div>

      {/* Suggested Questions Pill Strip */}
      <div className="bg-[#ffffff] border border-[#e6e6e1] p-3 rounded-2xl">
        <span className="text-[10px] text-neutral-600 uppercase font-bold tracking-wider block mb-2 flex items-center gap-1">
          <Sparkles size={12} className="text-neutral-900" /> Recommended Manual Queries:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {RECOMMENDED_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(q)}
              className="text-xs bg-[#f0f0ec] hover:bg-[#f0f0ec] text-neutral-700 hover:text-neutral-900 px-3 py-1 rounded-xl border border-[#e6e6e1] transition"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Thread */}
      <div className="bg-[#ffffff] border border-[#e6e6e1] rounded-2xl p-4 min-h-[380px] max-h-[500px] overflow-y-auto space-y-4 shadow-xl">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'ai' && (
              <div className="w-8 h-8 rounded-xl bg-[#FFCD11]/20 border border-[#FFCD11]/40 text-neutral-900 flex items-center justify-center flex-shrink-0">
                <Bot size={16} />
              </div>
            )}
            <div
              className={`max-w-xl p-3.5 rounded-2xl text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-neutral-900 text-white font-semibold'
                  : 'bg-[#f0f0ec] border border-[#e6e6e1] text-neutral-800'
              }`}
            >
              <p>{m.text}</p>
              <span className={`text-[9px] block text-right mt-1 font-mono ${m.sender === 'user' ? 'text-white/60' : 'text-neutral-500'}`}>
                {m.time}
              </span>
            </div>
            {m.sender === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-gray-800 text-neutral-900 flex items-center justify-center flex-shrink-0">
                <User size={16} />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-neutral-900 font-mono animate-pulse">
            <Bot size={14} /> CAT AI is analyzing technical documentation...
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSend();
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask CAT AI about machine specs, error codes, fluid capacities, safety zones..."
          className="flex-1 bg-[#ffffff] border border-[#e6e6e1] text-xs text-neutral-900 px-4 py-3 rounded-xl outline-none focus:border-[#FFCD11]"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-neutral-900 hover:bg-[#e0a218] text-white font-black text-xs px-5 py-3 rounded-xl transition disabled:opacity-40 flex items-center gap-1.5 shadow-lg "
        >
          <Send size={14} /> Send
        </button>
      </form>
    </div>
  );
}
