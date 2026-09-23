import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, PlayCircle, Award } from 'lucide-react';

const API = 'http://localhost:5000';
const TYPE_ICONS = { simulation: '🎮', video: '▶️', quiz: '📝', checklist: '✅' };

export default function Training() {
  const [modules, setModules] = useState([]);
  const [progress, setProgress] = useState('');
  const [coaching, setCoaching] = useState('');
  const [completing, setCompleting] = useState(null);

  const load = () => {
    fetch(`${API}/training/modules?operator_id=OP001`)
      .then(r => r.json())
      .then(d => { setModules(d.modules || []); setProgress(d.progress || ''); })
      .catch(() => {});

    fetch(`${API}/operator/coaching?operator_id=OP001`)
      .then(r => r.json())
      .then(d => setCoaching(d.debrief || ''))
      .catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const completeModule = async (moduleId) => {
    setCompleting(moduleId);
    try {
      await fetch(`${API}/training/complete`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operator_id: 'OP001', module_id: moduleId, score: 90 }),
      });
      load();
    } catch { }
    setCompleting(null);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Training Hub</h1>
        {progress && (
          <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg">
            <Award className="text-cat-yellow" size={18} />
            <span className="text-sm text-gray-300">{progress}</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {modules.length > 0 && (
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-400 mb-1">
            <span>Overall Progress</span>
            <span>{modules.filter(m => m.completed).length}/{modules.length} modules</span>
          </div>
          <div className="bg-gray-700 rounded-full h-3">
            <div className="bg-cat-yellow h-3 rounded-full transition-all"
              style={{ width: `${(modules.filter(m => m.completed).length / modules.length) * 100}%` }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {modules.map(m => (
          <div key={m.id} className={`bg-gray-800 p-5 rounded-xl border transition-all ${m.completed ? 'border-green-700' : 'border-gray-700 hover:border-cat-yellow'}`}>
            <div className="flex justify-between items-start mb-3">
              <span className="text-lg">{TYPE_ICONS[m.type] || '📖'}</span>
              {m.completed
                ? <CheckCircle className="text-green-400" size={20} />
                : <div className="w-5 h-5 rounded-full border-2 border-gray-500" />}
            </div>
            <h3 className="font-bold text-base mb-1">{m.title}</h3>
            <p className="text-gray-400 text-sm mb-3">{m.description}</p>
            {m.completed
              ? <div className="text-green-400 text-sm font-medium">Completed · Score {m.score}%</div>
              : (
                <button onClick={() => completeModule(m.id)}
                  disabled={completing === m.id}
                  className="bg-cat-yellow text-black px-3 py-1.5 rounded text-sm font-bold hover:bg-yellow-400 transition disabled:opacity-60 flex items-center gap-1.5">
                  <PlayCircle size={14} />
                  {completing === m.id ? 'Completing…' : 'Start'}
                </button>
              )}
          </div>
        ))}
      </div>

      {/* Post-shift coaching */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <BookOpen className="text-cat-yellow" size={20} /> Post-Shift AI Coaching
        </h2>
        <p className="text-gray-300 italic text-base leading-relaxed">
          {coaching || 'Loading your personalised debrief…'}
        </p>
      </div>
    </div>
  );
}
