// logger.js — In-memory event log (persists across the session)
export const LOG_CATEGORIES = { TASK:'TASK', SAFETY:'SAFETY', FUEL:'FUEL', SYSTEM:'SYSTEM' };
export const LOG_SEVERITY   = { INFO:'INFO', WARNING:'WARNING', CRITICAL:'CRITICAL' };

const _log = [];

export function logEvent(category, message, severity = LOG_SEVERITY.INFO) {
  _log.unshift({ ts: new Date().toISOString(), category, message, severity, id: Date.now() });
  if (_log.length > 200) _log.pop();
}

export function getLogs() { return [..._log]; }
export function clearLogs() { _log.length = 0; }

// Subscribe to log updates via polling
export function subscribeLogs(callback, intervalMs = 1000) {
  const id = setInterval(() => callback(getLogs()), intervalMs);
  callback(getLogs()); // immediate first call
  return () => clearInterval(id);
}
