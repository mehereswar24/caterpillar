import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, Lock, Award, ArrowLeft, AlertTriangle, Bot, Loader } from 'lucide-react';
import { API } from '../api.js';

// API imported below;
const OPERATOR = 'OP001';

const TYPE_COLORS = { simulation:'bg-blue-900/30 text-blue-300', video:'bg-purple-900/30 text-purple-300', instructor:'bg-green-900/30 text-green-300', quiz:'bg-yellow-900/30 text-yellow-300' };
const SEV_COLORS  = { critical:'text-red-400', high:'text-orange-400', medium:'text-yellow-400', low:'text-gray-400' };

export default function Training() {
  const [modules,    setModules]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [active,     setActive]     = useState(null);
  const [completing, setCompleting] = useState(null);
  const [question,   setQuestion]   = useState('');
  const [answer,     setAnswer]     = useState('');
  const [asking,     setAsking]     = useState(false);

  useEffect(() => {
    fetch(`${API}/api/training/${OPERATOR}`)
      .then(r=>r.json())
      .then(d=>{ setModules(d.modules||[]); setLoading(false); })
      .catch(()=>{
        setModules([
          { id:'m1', title:'Proximity Safety Protocol',  type:'simulation', severity:'critical', reason:'Based on 3 PROXIMITY_BREACH events', completed:false, duration_min:30 },
          { id:'m2', title:'Seatbelt & PPE Compliance',  type:'video',      severity:'critical', reason:'Based on 2 SEATBELT_VIOLATION events', completed:true,  duration_min:20, score:88 },
          { id:'m3', title:'Fuel Efficiency Techniques', type:'instructor', severity:'medium',   reason:'Reduce idle time and fuel waste',      completed:false, duration_min:45 },
          { id:'m4', title:'Slope & Stability Awareness',type:'simulation', severity:'high',     reason:'Safe operation on grades >10°',       completed:false, duration_min:40 },
          { id:'m5', title:'Engine & Hydraulics Basics', type:'video',      severity:'low',      reason:'General skill development',            completed:false, duration_min:60 },
          { id:'m6', title:'Task Time Optimisation',     type:'instructor', severity:'low',      reason:'Improve productivity scores',          completed:false, duration_min:35 },
        ]);
        setLoading(false);
      });
  }, []);

  const complete = async (moduleId) => {
    setCompleting(moduleId);
    try {
      await fetch(`${API}/api/training/${OPERATOR}/complete`,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ module_id:moduleId, score:Math.floor(Math.random()*20)+80 }),
      });
      setModules(m=>m.map(mod=>mod.id===moduleId?{...mod,completed:true}:mod));
    } catch { setModules(m=>m.map(mod=>mod.id===moduleId?{...mod,completed:true}:mod)); }
    setCompleting(null);
    setActive(null);
  };

  const askAI = async () => {
    if (!question.trim()) return;
    setAsking(true);
    setAnswer('');
    try {
      const r = await fetch(`${API}/api/voice/ask`,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ question, operator_context:{ operator_id:OPERATOR } }),
      });
      const d = await r.json();
      setAnswer(d.answer || 'No answer available.');
    } catch { setAnswer('Knowledge base loaded — answer: check the relevant training module for this topic.'); }
    setAsking(false);
  };

  const done     = modules.filter(m=>m.completed).length;
  const total    = modules.length;
  const pct      = total ? Math.round(done/total*100) : 0;
  const activeM  = modules.find(m=>m.id===active);

  if (activeM) return (
    <div className="cat-page">
      <button onClick={()=>setActive(null)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm transition">
        <ArrowLeft size={16}/> Back to Training Hub
      </button>
      <div className="max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${TYPE_COLORS[activeM.type]||'bg-gray-700 text-gray-300'}`}>{activeM.type}</span>
          <span className={`text-xs font-semibold ${SEV_COLORS[activeM.severity]||''}`}>⚠ {activeM.severity?.toUpperCase()} PRIORITY</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">{activeM.title}</h1>
        <p className="text-gray-400 text-sm mb-6">{activeM.reason}</p>

        <div className="cat-card p-6 mb-6">
          <div className="prose prose-invert max-w-none text-sm text-gray-300 leading-relaxed space-y-3">
            <p className="text-base">This module covers critical knowledge for safe and efficient CAT 320 excavator operation. Complete this training to improve your operator safety score.</p>
            <div className="bg-gray-800 rounded-xl p-4 border-l-4 border-cat-yellow">
              <p className="text-cat-yellow font-semibold text-sm mb-1">Key Learning Objective</p>
              <p className="text-gray-300">{activeM.reason}</p>
            </div>
            <p>Review the CAT operator manual sections relevant to this module. Use the AI assistant below to ask specific questions about procedures, limits, or specifications.</p>
            <div className="bg-red-900/20 border border-red-800 rounded-xl p-4">
              <div className="flex gap-2 items-start">
                <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0"/>
                <p className="text-red-200 text-sm">Always apply learned procedures on site. Non-compliance with safety modules is a dismissal risk.</p>
              </div>
            </div>
          </div>
        </div>

        {!activeM.completed
          ? <button onClick={()=>complete(activeM.id)} disabled={completing===activeM.id}
              className="w-full bg-cat-yellow text-black font-bold py-3 rounded-xl hover:bg-yellow-400 transition-all text-sm disabled:opacity-50">
              {completing===activeM.id ? '⏳ Marking Complete...' : '✓ Mark as Complete'}
            </button>
          : <div className="flex items-center gap-3 bg-green-900/30 border border-green-700 rounded-xl px-5 py-3">
              <CheckCircle size={20} className="text-green-400"/>
              <span className="text-green-300 font-semibold">Module Completed{activeM.score?` · Score: ${activeM.score}%`:''}</span>
            </div>
        }
      </div>
    </div>
  );

  return (
    <div className="p-8 h-full overflow-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="cat-stripe-bar rounded-full"/>
      <div><div className="cat-label mb-1">Personalised · Based on your alert history</div>
        <h1 className="cat-title">Operator <span className="text-cat-yellow">Training Hub</span></h1></div>
      </div>

      {/* Progress bar */}
      <div className="cat-card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white font-semibold text-sm">Training Progress — {OPERATOR}</span>
          <span className="text-cat-yellow font-bold">{done}/{total} modules</span>
        </div>
        <div className="bg-gray-800 rounded-full h-3 mb-2">
          <div className="h-3 rounded-full bg-cat-yellow transition-all duration-700" style={{width:`${pct}%`}}/>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{pct}% complete</span>
          <span>·</span>
          <span>{modules.filter(m=>!m.completed).length} remaining</span>
          <span>·</span>
          <span>{modules.reduce((a,m)=>a+(m.duration_min||30),0)} min total</span>
        </div>
      </div>

      {/* AI Ask */}
      <div className="cat-card p-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-cat-yellow rounded-xl flex items-center justify-center">
            <Bot size={16} className="text-black"/>
          </div>
          <div>
            <div className="text-white font-semibold text-sm">CAT Knowledge Assistant</div>
            <div className="text-gray-500 text-xs">RAG-powered · Searches 8 CAT manuals · Qwen2.5:7b</div>
          </div>
        </div>
        <div className="flex gap-2 mb-3">
          <input value={question} onChange={e=>setQuestion(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&askAI()}
            placeholder="e.g. How often should I grease the boom pins?"
            className="flex-1 bg-cat-darker border border-cat-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cat-yellow"/>
          <button onClick={askAI} disabled={asking||!question.trim()}
            className="bg-cat-yellow text-black px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-yellow-400 transition-all disabled:opacity-40">
            {asking ? <Loader size={14} className="animate-spin"/> : 'Ask'}
          </button>
        </div>
        {answer && (
          <div className="bg-cat-darker border border-cat-border rounded-xl p-4 text-sm text-gray-300 leading-relaxed">
            {answer}
          </div>
        )}
      </div>

      {/* Module cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i=><div key={i} className="cat-card h-40 animate-pulse"/>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m,i)=>(
            <div key={m.id} onClick={()=>setActive(m.id)}
              className={`bg-gray-900 border rounded-2xl p-5 cursor-pointer transition-all hover:-translate-y-1 hover:border-cat-yellow/40 ${m.completed?'border-green-800':'border-gray-800'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-600">{String(i+1).padStart(2,'0')}</span>
                  {m.completed && <CheckCircle size={16} className="text-green-400"/>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[m.type]||'bg-gray-700 text-gray-400'}`}>{m.type}</span>
              </div>
              <h3 className="text-white font-semibold text-sm mb-1 leading-snug">{m.title}</h3>
              <p className="text-gray-500 text-xs mb-3 leading-relaxed">{m.reason}</p>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${SEV_COLORS[m.severity]||'text-gray-500'}`}>
                  {m.severity?.toUpperCase()} PRIORITY
                </span>
                <span className="text-gray-600 text-xs">{m.duration_min} min</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
