import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, Wind, Thermometer } from 'lucide-react';
import VoiceBar from '../components/VoiceBar';
import TaskCard from '../components/TaskCard';

const API = 'http://localhost:8000';

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [weather, setWeather] = useState('Cloudy, 22°C');
  const [score, setScore] = useState(null);
  const [wellness, setWellness] = useState(null);

  useEffect(() => {
    fetch(`${API}/task/dashboard?operator_id=OP001`)
      .then(r => r.json()).then(d => { if (d.tasks) setTasks(d.tasks); setWeather(d.weather || 'Cloudy, 22°C'); })
      .catch(() => setTasks([
        { id: 1, type: 'Trenching', location: 'Sector 4', status: 'In Progress', eta: '52 min', explanation: 'Wet soil +18m, Cloudy +2m' },
        { id: 2, type: 'Loading', location: 'Sector 2', status: 'Scheduled', eta: '30 min', explanation: 'Dry soil, normal conditions' },
        { id: 3, type: 'Grading', location: 'Sector 1', status: 'Pending', eta: '65 min', explanation: 'Est. after current tasks' },
      ]));

    fetch(`${API}/operator/score?operator_id=OP001`)
      .then(r => r.json()).then(setScore).catch(() => {});

    fetch(`${API}/operator/wellness?operator_id=OP001`)
      .then(r => r.json()).then(setWellness).catch(() => {});
  }, []);

  return (
    <div className="p-8 relative min-h-full flex flex-col">
      {/* Header */}
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Operator Dashboard</h1>
          <p className="text-gray-400">Shift #142 · EXC001 · Operator OP001</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-gray-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <Thermometer className="text-cat-yellow" size={18} />
            <span className="text-sm">{weather}</span>
          </div>
          {wellness?.break_recommended && (
            <div className="bg-orange-900/60 border border-orange-500 px-4 py-3 rounded-lg flex items-center gap-2">
              <Clock className="text-orange-400" size={18} />
              <span className="text-sm text-orange-300">Break recommended</span>
            </div>
          )}
        </div>
      </header>

      {/* Score strip */}
      {score && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Safety Score', value: `${score.safety_score}/100`, color: score.safety_score >= 80 ? 'text-green-400' : 'text-orange-400' },
            { label: 'Efficiency', value: `${score.efficiency_score}/100`, color: 'text-blue-400' },
            { label: 'Idle Mins', value: `${score.idle_minutes} min`, color: score.idle_minutes > 30 ? 'text-orange-400' : 'text-gray-300' },
            { label: 'Proximity Alerts', value: score.proximity_alerts, color: score.proximity_alerts > 0 ? 'text-red-400' : 'text-gray-300' },
          ].map(s => (
            <div key={s.label} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-xs mb-1">{s.label}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Task cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {tasks.map(t => (
          <TaskCard
            key={t.id}
            title={`${t.type} — ${t.location}`}
            eta={t.eta}
            shap={t.explanation}
            status={t.status}
          />
        ))}
      </div>

      {/* Voice bar pinned to bottom */}
      <div className="mt-auto">
        <VoiceBar />
      </div>
    </div>
  );
}
