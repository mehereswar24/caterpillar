import React, { useState } from 'react';
import { BookOpen, FileText, CheckCircle, Lock, Award, TrendingUp, Sparkles, MessageSquare, ArrowLeft, AlertTriangle, Mic, Search, Bot } from 'lucide-react';

const AskAI = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState(null);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/voice/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: query, operator_id: 'OP1', machine_id: 'EXC1' })
      });
      const data = await res.json();
      setAnswer(data.speech_text);
    } catch (err) {
      setAnswer("The engine takes CAT DEO 15W-40 oil. (Offline Fallback)");
    }
    setLoading(false);
  };

  return (
    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-cat-yellow/30 rounded-3xl p-8 mb-10 shadow-[0_0_30px_rgba(255,184,28,0.1)] relative overflow-hidden">
      <div className="absolute right-0 top-0 w-64 h-64 bg-cat-yellow/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
      
      <div className="flex items-start gap-6 relative z-10">
        <div className="bg-cat-yellow p-4 rounded-2xl shadow-[0_0_15px_rgba(255,184,28,0.5)]">
          <Bot className="text-black w-8 h-8" />
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-white mb-2">CAT Operator Assistant</h3>
          <p className="text-gray-400 text-lg mb-6">Ask any question about the machine, alarms, or procedures. I'll search the manuals instantly.</p>
          
          <form onSubmit={handleAsk} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-6 h-6" />
              <input 
                type="text" 
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="e.g., What does alarm E360 mean?" 
                className="w-full bg-black/50 border border-white/20 text-white text-lg rounded-xl pl-14 pr-4 py-4 focus:outline-none focus:border-cat-yellow transition-colors"
              />
            </div>
            <button type="submit" disabled={loading} className="bg-cat-yellow text-black font-bold px-8 py-4 rounded-xl hover:bg-yellow-400 transition-colors text-lg flex items-center gap-2">
              {loading ? <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div> : "Ask AI"}
            </button>
          </form>
          
          {answer && (
            <div className="mt-6 bg-black/60 border border-cat-yellow/40 rounded-xl p-6 animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="text-cat-yellow w-5 h-5" />
                <span className="text-cat-yellow font-bold tracking-wider uppercase text-sm">AI Answer</span>
              </div>
              <p className="text-white text-xl leading-relaxed">{answer}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ManualView = ({ module }) => {
  const [read, setRead] = useState(module.status === 'Completed');

  if (module.status === 'Locked') {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-16 flex flex-col items-center justify-center text-center mt-4 shadow-xl">
        <Lock className="w-24 h-24 text-gray-600 mb-6" />
        <h4 className="text-3xl font-bold text-gray-400 mb-4">Manual Locked</h4>
        <p className="text-gray-500 text-xl max-w-lg">Read and acknowledge the prerequisite safety manuals before unlocking this technical document.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-12 mt-4 shadow-2xl max-w-5xl mx-auto">
      <div className="prose prose-invert max-w-none text-gray-200 text-xl leading-relaxed font-sans">
        {module.content}
      </div>
      
      <div className="mt-16 pt-10 border-t border-white/10 flex justify-between items-center bg-black/30 p-8 rounded-xl">
         {read ? (
           <div className="flex items-center gap-4 text-green-500 font-bold text-2xl animate-in fade-in duration-500">
             <CheckCircle className="w-10 h-10" /> Document Acknowledged
           </div>
         ) : (
           <button 
             onClick={() => setRead(true)}
             className="w-full bg-cat-yellow text-black font-extrabold px-8 py-5 rounded-xl hover:bg-yellow-400 transition-colors text-2xl shadow-[0_0_20px_rgba(255,184,28,0.4)]"
           >
             I have read this manual
           </button>
         )}
      </div>
    </div>
  );
};

const modules = [
  {
    id: 1,
    title: "Proximity Safety Protocol",
    type: "Safety Guide",
    icon: FileText,
    progress: 100,
    status: "Completed",
    description: "Standard operating procedures for working near ground personnel.",
    color: "text-green-500",
    content: (
      <>
        <h2 className="text-5xl font-bold text-white mb-4">Proximity Safety & Spotter Protocol</h2>
        <p className="text-gray-500 mb-10 font-mono text-lg">Ref: CAT-SAF-101 | Rev: 2.4</p>
        
        <h3 className="text-3xl font-bold text-cat-yellow mb-4 border-b border-white/10 pb-2 mt-8">1.0 Ground Personnel</h3>
        <p className="mb-6">Maintain a strict minimum clearance of 2 meters from any ground personnel. If a worker breaches this zone, STOP all joystick movement immediately.</p>
        
        <div className="bg-red-500/10 border-l-8 border-red-500 p-8 mb-10 rounded-r-xl shadow-lg">
          <div className="flex items-center gap-4 mb-4">
            <AlertTriangle className="text-red-500 w-10 h-10 animate-pulse" />
            <h4 className="text-red-500 font-bold text-3xl tracking-tight">DANGER: FATAL CRUSH ZONE</h4>
          </div>
          <p className="text-red-200/90 text-xl">Never bypass the proximity radar system. Visual contact is mandatory.</p>
        </div>

        <h3 className="text-3xl font-bold text-cat-yellow mb-4 border-b border-white/10 pb-2">2.0 Blind Spots</h3>
        <p className="mb-4">The excavator has massive blind spots on the rear-right quadrant.</p>
        <ul className="list-disc pl-8 space-y-4 mb-8 text-gray-200 text-xl">
          <li>If you lose sight of the spotter, STOP immediately.</li>
          <li>Always check the digital radar before reversing.</li>
          <li>Sound the horn twice before moving backwards.</li>
        </ul>
      </>
    )
  },
  {
    id: 2,
    title: "Pre-Shift Walkaround",
    type: "Procedure",
    icon: BookOpen,
    progress: 0,
    status: "Unread",
    description: "Mandatory daily visual and mechanical inspection checklist.",
    color: "text-cat-yellow",
    content: (
      <>
        <h2 className="text-5xl font-bold text-white mb-4">Pre-Shift Inspection</h2>
        <p className="text-gray-500 mb-10 font-mono text-lg">Ref: CAT-MNT-201</p>
        
        <h3 className="text-3xl font-bold text-cat-yellow mb-6 border-b border-white/10 pb-2">1.0 Ground Checks</h3>
        <ul className="list-disc pl-8 space-y-4 mb-10 text-gray-200 text-xl">
          <li><strong>Undercarriage:</strong> Inspect track tension. Look for missing shoes.</li>
          <li><strong>Final Drives:</strong> Check for oil leaks under the sprockets.</li>
          <li><strong>Structure:</strong> Inspect the boom and bucket for cracks.</li>
        </ul>

        <h3 className="text-3xl font-bold text-cat-yellow mb-6 border-b border-white/10 pb-2">2.0 Fluid Levels</h3>
        <ul className="list-disc pl-8 space-y-4 mb-8 text-gray-200 text-xl">
          <li><strong>Engine Oil:</strong> Dipstick should read between ADD and FULL.</li>
          <li><strong>Hydraulic Fluid:</strong> Check the sight gauge on the side tank.</li>
          <li><strong>Fuel/Water:</strong> Drain water from the separator bowl.</li>
        </ul>
      </>
    )
  }
];

export default function Training() {
  const [activeId, setActiveId] = useState(null);
  const activeModule = modules.find(m => m.id === activeId);

  if (activeModule) {
    return (
      <div className="p-10 h-full flex flex-col overflow-y-auto">
        <button 
          onClick={() => setActiveId(null)} 
          className="flex items-center gap-3 text-gray-300 hover:text-white w-fit mb-8 transition-colors font-medium bg-white/10 px-6 py-3 rounded-xl border border-white/20 hover:bg-white/20 text-lg shadow-lg"
        >
          <ArrowLeft size={24} /> Back to Operator Library
        </button>
        
        <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
           <ManualView module={activeModule} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 h-full flex flex-col overflow-y-auto">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <p className="text-cat-yellow font-bold tracking-widest text-lg uppercase mb-2 flex items-center gap-3">
            <BookOpen size={24} /> Operator Library
          </p>
          <h1 className="text-5xl font-light tracking-tight text-white">Reference Manuals</h1>
        </div>
      </header>

      {/* RAG Ask AI Interface */}
      <AskAI />

      <h2 className="text-3xl font-bold text-white mb-8">Quick Reference Cards</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
        {modules.map(mod => (
          <div 
            key={mod.id} 
            onClick={() => setActiveId(mod.id)}
            className={"bg-white/5 border border-white/10 rounded-[2rem] p-8 flex flex-col transition-all duration-300 shadow-2xl " + (mod.status === 'Locked' ? 'opacity-60 grayscale cursor-not-allowed' : 'hover:-translate-y-2 hover:border-cat-yellow/50 cursor-pointer')}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="p-4 rounded-2xl bg-black/50 border border-white/10 shadow-inner">
                <mod.icon className={"w-8 h-8 " + mod.color} />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest text-gray-400 bg-black/50 px-4 py-2 rounded-full border border-white/10">{mod.type}</span>
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-3">{mod.title}</h3>
            <p className="text-lg text-gray-400 mb-8 flex-1 leading-relaxed">{mod.description}</p>
            
            <div className="mt-auto pt-6 border-t border-white/10">
              <div className="flex justify-between text-lg mb-3">
                <span className={"font-bold tracking-wider uppercase " + (mod.status === 'Locked' ? 'text-gray-500' : mod.status === 'Completed' ? 'text-green-500' : 'text-cat-yellow')}>
                  {mod.status}
                </span>
                <span className="text-gray-300 font-bold">{mod.progress}%</span>
              </div>
              <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-white/5">
                <div 
                  className={"h-full shadow-[0_0_15px_currentColor] " + (mod.status === 'Completed' ? 'bg-green-500' : 'bg-cat-yellow')}
                  style={{ width: mod.progress + '%' }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
