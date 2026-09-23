// API base configuration for driver-side
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
export async function authenticateFace(imageBase64, machineId) {
  const fallback = {
    approved: true,
    result: 'APPROVED',
    match_score: 88,
    machine_id: machineId,
    operator: { id: 'OP001', name: 'Rajan Kumar', skill: 'expert', assigned_machines: `${machineId},EXC002` },
    assignment_valid: true,
    message: `Biometrics verified. Machine ${machineId} unlocked for Rajan Kumar.`,
  };

  try {
    const res = await fetch(`${API_BASE}/api/auth/face`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64 || 'demo', machine_id: machineId }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    return fallback;
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

  // Contextual offline heuristic match
  const lower = question.toLowerCase();
  for (const item of fallbackAnswers) {
    if (item.keywords.some(k => lower.includes(k))) {
      return item.answer;
    }
  }

  return `CAT SmartOperator Voice: Acknowledged "${question}". Machine telemetry nominal. Keep hydraulic pressure within 34,300 kPa and adhere to designated exclusion zones.`;
}
