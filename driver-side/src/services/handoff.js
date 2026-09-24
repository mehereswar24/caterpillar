// handoff.js — Operator assignment resolution (localStorage + API fallback)
import { getAssignedTasks } from '../api.js';

const STORAGE_KEY = 'cat_operator_assignment';

const DEFAULT_ASSIGNMENT = {
  operatorId:    'OP001',
  operatorName:  'Rajan Kumar',
  skillLevel:    'expert',
  machineId:     'EXC001',
  taskId:        'TSK-4092',
  taskName:      'Deep Trenching Pipeline B',
  estimatedTimeMin: 120,
  siteZone:      'Sector 4B — South Valley',
};

export async function resolveOperatorHandoff() {
  // 1. Check localStorage for a saved assignment (from supervisor UI)
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}

  // 2. Try API
  try {
    const tasks = await getAssignedTasks('EXC001', 'OP001');
    if (tasks?.length) {
      const t = tasks[0];
      return {
        operatorId:       'OP001',
        operatorName:     'Rajan Kumar',
        skillLevel:       'expert',
        machineId:        t.machine_id || 'EXC001',
        taskId:           t.task_id || 'TSK-4092',
        taskName:         t.task_type || 'Deep Trenching Pipeline B',
        estimatedTimeMin: t.estimated_time || 120,
        siteZone:         'Sector 4B — South Valley',
      };
    }
  } catch {}

  return DEFAULT_ASSIGNMENT;
}

export function subscribeToOperatorAssignments(callback) {
  // Listen for cross-tab assignment updates via storage events
  const handler = (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try { callback(JSON.parse(e.newValue)); } catch {}
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

export function publishAssignment(assignment) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assignment));
}
