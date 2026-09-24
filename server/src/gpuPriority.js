// gpuPriority.js — the GPU is shared by the cab-camera vision model and the voice/text assistant.
// A spoken question must not queue behind camera frames (or force a model swap), so while a question is in
// flight — and for a short moment after — the cab-camera route skips frames.
let inFlight = 0;
let lastEnd = 0;
const COOLDOWN_MS = 2500;

module.exports = {
  begin() { inFlight += 1; },
  end() { inFlight = Math.max(0, inFlight - 1); lastEnd = Date.now(); },
  busy() { return inFlight > 0 || Date.now() - lastEnd < COOLDOWN_MS; },
};
