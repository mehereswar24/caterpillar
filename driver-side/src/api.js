// API base configuration for driver-side
import { kbAnswer } from './services/kb';
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function fetchWithFallback(endpoint, options = {}, fallbackData = null) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[Driver API] ${endpoint} request failed, using client fallback:`, err.message);
    return fallbackData;
  }
}

// Operators list
export async function getOperators() {
  const fallback = {
    operators: [
      { operator_id: 'OP001', name: 'Rajan Kumar', assigned_machines: 'EXC001,EXC002', skill_level: 'expert' },
      { operator_id: 'OP002', name: 'Suresh Patel', assigned_machines: 'EXC001,EXC003', skill_level: 'intermediate' },
      { operator_id: 'OP003', name: 'Anita Sharma', assigned_machines: 'EXC002,EXC004', skill_level: 'expert' },
      { operator_id: 'OP004', name: 'David Okafor', assigned_machines: 'EXC003,EXC005', skill_level: 'beginner' },
      { operator_id: 'OP005', name: 'Maria Santos', assigned_machines: 'EXC004,EXC005', skill_level: 'intermediate' },
    ]
  };
  return fetchWithFallback('/api/auth/operators', {}, fallback);
}

// Face Auth
// Fails closed: any error (server down, vision model down, bad image) is a denial, never an approval.
export async function authenticateFace(imageBase64, machineId, operatorId) {
  try {
    const res = await fetch(`${API_BASE}/api/auth/face`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64, machine_id: machineId, operator_id: operatorId }),
    });
    const data = await res.json().catch(() => null);
    if (data && typeof data.approved === 'boolean') return data;   // includes the server's own denials (400/503 bodies)
    throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    return {
      approved: false,
      result: 'ERROR',
      message: `Cannot reach the authentication server (${e.message}). Machine stays locked — ask a supervisor for an override.`,
    };
  }
}

// Tasks for current machine & operator
export async function getAssignedTasks(machineId = 'EXC001', operatorId = 'OP001') {
  const fallback = {
    tasks: [
      {
        task_id: 'TSK-4092',
        machine_id: machineId,
        operator_id: operatorId,
        task_type: 'Deep Trenching Pipeline B',
        estimated_time: 120, // mins
        actual_time: 0,
        weather: 'Sunny (32°C)',
        soil_type: 'Rocky Limestone / Clay',
        date: new Date().toISOString().split('T')[0],
      }
    ]
  };
  const data = await fetchWithFallback(`/api/tasks?machine_id=${machineId}&operator_id=${operatorId}`, {}, fallback);
  return data?.tasks?.length ? data.tasks : fallback.tasks;
}

// Ask Voice assistant
export async function askVoiceAssistant(question, context = {}) {
  const fallbackAnswers = [
    {
      keywords: ['tilt', 'slope', 'angle', 'grade'],
      answer: 'Maximum safe tilt angle for the CAT 320 is 15 degrees for continuous work and never exceed 35 degrees on slopes. Always drive directly up and down slopes, never sideways.'
    },
    {
      keywords: ['fuel', 'tank', 'capacity', 'refill', 'petrol', 'diesel'],
      answer: 'Fuel tank capacity is 345 litres (nominal 410L max). Current consumption averages 18.5 L/hr under standard excavation load.'
    },
    {
      keywords: ['oil', 'engine', 'maintenance', 'filter'],
      answer: 'Engine oil capacity is 22 litres with filter using CAT DEO 15W-40. Check oil levels every 10 operating hours.'
    },
    {
      keywords: ['proximity', 'zone', 'human', 'worker', 'distance'],
      answer: 'SAFETY ALERT: Maintain a minimum 5-meter safety exclusion zone around the excavator. Stop immediately if any ground personnel breach this boundary.'
    },
    {
      keywords: ['task', 'time', 'status', 'finish'],
      answer: 'Your current assigned task is Deep Trenching Pipeline B with an estimated duration of 120 minutes. Progress is currently on schedule.'
    },
  ];

  try {
    const res = await fetch(`${API_BASE}/api/voice/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, operator_context: context }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.answer && !data.answer.includes('Ollama not available') && !data.answer.includes('unreachable')) {
        return data.answer;
      }
    }
  } catch (err) {}

  // The LLM was unreachable or too slow: answer straight from the manuals (same knowledge base the server uses)
  const fromKb = kbAnswer(question);
  if (fromKb) return fromKb;

  return "I couldn't find that in the CAT 320 manuals. Try asking about specs, maintenance intervals, troubleshooting, safety or emergency procedures.";
}

// Learning Hub — training modules (server route: /api/training). Falls back to local data + localStorage progress.
const LOCAL_MODULES = [
  { id: 'm1', title: 'Proximity Safety Protocol', type: 'simulation', duration_min: 30, severity: 'critical', reason: 'Prevent worker proximity breaches in exclusion zone' },
  { id: 'm2', title: 'Seatbelt & PPE Compliance', type: 'video', duration_min: 20, severity: 'critical', reason: 'Seatbelt must be fastened at all times when engine is running' },
  { id: 'm3', title: 'Fuel Efficiency Techniques', type: 'instructor', duration_min: 45, severity: 'medium', reason: 'Reduce idle time and optimise fuel consumption per shift' },
  { id: 'm4', title: 'Slope & Stability Awareness', type: 'simulation', duration_min: 40, severity: 'high', reason: 'Safe operation on grades above 10 degrees' },
  { id: 'm5', title: 'Engine & Hydraulics Basics', type: 'video', duration_min: 60, severity: 'low', reason: 'General mechanical knowledge for CAT 320 operators' },
  { id: 'm6', title: 'Task Time Optimisation', type: 'instructor', duration_min: 35, severity: 'low', reason: 'Improve productivity and reduce task overrun' },
];

function readLocalProgress(operatorId) {
  try { return JSON.parse(localStorage.getItem(`learning:${operatorId}`)) || {}; } catch { return {}; }
}

export async function getTrainingModules(operatorId = 'OP001') {
  try {
    const res = await fetch(`${API_BASE}/api/training/${operatorId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data?.modules?.length) return data.modules;
  } catch (err) {
    console.warn('[Driver API] training request failed, using local modules:', err.message);
  }
  const progress = readLocalProgress(operatorId);
  return LOCAL_MODULES.map(m => ({
    ...m,
    completed: !!progress[m.id],
    score: progress[m.id]?.score ?? null,
    completed_at: progress[m.id]?.completed_at ?? null,
  }));
}

export async function completeTrainingModule(operatorId = 'OP001', moduleId, score) {
  try {
    const progress = readLocalProgress(operatorId);
    progress[moduleId] = { score, completed_at: new Date().toISOString() };
    localStorage.setItem(`learning:${operatorId}`, JSON.stringify(progress));
  } catch {}
  try {
    const res = await fetch(`${API_BASE}/api/training/${operatorId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module_id: moduleId, score }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
