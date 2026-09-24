import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, GripHorizontal, RotateCcw } from 'lucide-react';
import { API_BASE } from '../api';
import { CAB_POLL_MS, captureFrame, analyzeCabFrame, evaluateCab } from '../services/cabMonitor';
import { createFaceTracker } from '../services/faceTracker';
import { createDriverState } from '../services/driverState';
import { setCabInfo } from '../services/liveLink';
import CabMetricsPanel from './CabMetrics';
import { registerCabVideo } from '../services/liveLink';

const POS_KEY = 'cat_cab_camera_pos';
const loadPos = () => { try { return JSON.parse(localStorage.getItem(POS_KEY)); } catch { return null; } };
const FAST_MS = 100;      // on-device face tracker: ~10 Hz
const UI_MS = 250;        // how often the panel re-renders from it

// Two-speed operator monitor:
//   FAST  (~10 Hz, on-device MediaPipe): eyes shut / microsleep / PERCLOS, yawning, head drop, looking away, absent
//   SLOW  (~3 s, local Qwen2.5-VL):      seatbelt, phone, hard hat, smoking, eating
// Both feed the same alert stream (strobe, buzzer, log) through onAlerts.
export default function CabCameraCard({ onAlerts }) {
  const [enabled, setEnabled] = useState(true);
  const [camStatus, setCamStatus] = useState('starting');     // starting | live | nocam
  const [trackStatus, setTrackStatus] = useState('loading');  // loading | ready | error
  const [vlmStatus, setVlmStatus] = useState('waiting');      // waiting | live | offline
  const [m, setM] = useState(null);                           // fast metrics
  const [sem, setSem] = useState(null);                       // latest semantic observation
  const [latency, setLatency] = useState(null);
  const videoRef   = useRef(null);
  const cardRef    = useRef(null);
  const dragRef    = useRef(null);
  const stateRef   = useRef(null);
  const [pos, setPos] = useState(loadPos);   // {x, y} in px from top-left; null = default bottom-left corner
  useEffect(() => { registerCabVideo(videoRef.current); return () => registerCabVideo(null); }, [enabled]);   // supervisor live view reads frames from this video
  const onAlertsRef = useRef(onAlerts);
  onAlertsRef.current = onAlerts;

  useEffect(() => {
    if (!enabled) { onAlertsRef.current?.([]); return; }
    let cancelled = false, stream = null, fastTimer = null, slowTimer = null;
    let fastBusy = false, slowBusy = false, fails = 0, lastUi = 0;
    let fastAlerts = [], slowAlerts = [], history = [];
    const tracker = createFaceTracker('VIDEO');
    const state = createDriverState();
    stateRef.current = state;
    tracker.ready.then(() => !cancelled && setTrackStatus('ready')).catch(() => !cancelled && setTrackStatus('error'));

    const publish = () => onAlertsRef.current?.([...fastAlerts, ...slowAlerts]);

    // FAST loop — on-device face tracking
    const fastTick = async () => {
      const v = videoRef.current;
      if (cancelled || fastBusy || !v || !v.videoWidth || v.readyState < 2) return;
      fastBusy = true;
      try {
        const now = performance.now();
        const obs = await tracker.detect(v, now);
        if (cancelled) return;
        const out = state.update(obs, now);
        const key = a => a.map(x => x.type).sort().join(',');
        if (key(out.alerts) !== key(fastAlerts)) { fastAlerts = out.alerts; publish(); }
        if (now - lastUi >= UI_MS) { lastUi = now; setM(out.metrics); }
      } catch { /* tracker hiccup: skip the frame */ }
      finally { fastBusy = false; }
    };

    // SLOW loop — semantic checks from the vision model
    const slowTick = async () => {
      if (cancelled || slowBusy) return;
      const frame = captureFrame(videoRef.current, 448);
      if (!frame) return;
      slowBusy = true;
      try {
        const res = await analyzeCabFrame(API_BASE, frame);
        if (cancelled || res.busy) return;
        fails = 0;
        setVlmStatus('live'); setSem(res.driver); setLatency(res.latency_ms);
        history = [...history, res.driver].slice(-8);
        const next = evaluateCab(history);
        const key = a => a.map(x => x.type).sort().join(',');
        if (key(next) !== key(slowAlerts)) { slowAlerts = next; publish(); }
      } catch {
        // never assume "all clear" when vision is down
        if (++fails >= 3) { setVlmStatus('offline'); setSem(null); history = []; if (slowAlerts.length) { slowAlerts = []; publish(); } }
      } finally { slowBusy = false; }
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        const v = videoRef.current;
        if (v) { v.srcObject = stream; await v.play().catch(() => {}); }
        setCamStatus('live');
        fastTimer = setInterval(fastTick, FAST_MS);
        slowTimer = setInterval(slowTick, CAB_POLL_MS);
        setTimeout(slowTick, 800);
      } catch {
        setCamStatus('nocam');
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(fastTimer); clearInterval(slowTimer);
      stream?.getTracks().forEach(t => t.stop());
      tracker.close();
      onAlertsRef.current?.([]);
    };
  }, [enabled]);

  // ── drag by the header ────────────────────────────────────────────────────
  const clamp = (x, y) => {
    const el = cardRef.current;
    const w = el?.offsetWidth ?? 256, h = el?.offsetHeight ?? 240;
    return { x: Math.min(Math.max(0, x), window.innerWidth - w), y: Math.min(Math.max(0, y), window.innerHeight - h) };
  };
  const onDragStart = (e) => {
    if (e.target.closest('button')) return;            // header buttons aren't a handle
    const rect = cardRef.current.getBoundingClientRect();
    dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onDragMove = (e) => {
    if (!dragRef.current) return;
    setPos(clamp(e.clientX - dragRef.current.dx, e.clientY - dragRef.current.dy));
  };
  const onDragEnd = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setPos(p => { try { p && localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch {} return p; });
  };
  useEffect(() => {
    const onResize = () => setPos(p => (p ? clamp(p.x, p.y) : p));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const face = m && m.driverPresent;
  const live = camStatus === 'live';

  // Publish the readout so the supervisor console shows exactly the same parameters.
  useEffect(() => {
    setCabInfo(enabled ? { m, sem, latency, vlmStatus, trackStatus, camStatus } : null);
  }, [enabled, m, sem, latency, vlmStatus, trackStatus, camStatus]);
  useEffect(() => () => setCabInfo(null), []);

  return (
    <div ref={cardRef} style={pos ? { left: pos.x, top: pos.y } : { left: 8, bottom: 88 }}
      className="fixed z-40 w-56 bg-[#ffffff]/95 border border-[#e6e6e1] rounded-2xl overflow-hidden shadow-2xl shadow-black/10 select-none">
      <div onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}
        onDoubleClick={() => { setPos(null); try { localStorage.removeItem(POS_KEY); } catch {} }}
        title="Drag to move · double-click to reset"
        className="flex items-center justify-between px-2.5 py-1.5 border-b border-[#e6e6e1] cursor-grab active:cursor-grabbing touch-none">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-neutral-600">
          <span className={`w-1.5 h-1.5 rounded-full ${live && trackStatus === 'ready' ? 'bg-emerald-500 animate-pulse' : live ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`} />
          Cab Camera
          <GripHorizontal size={12} className="text-neutral-400" />
        </div>
        <div className="flex items-center gap-2">
          {enabled && (
            <button type="button" onClick={() => stateRef.current?.recalibrate()} title="Recalibrate — sit normally and look ahead"
              className="text-neutral-500 hover:text-neutral-900 transition"><RotateCcw size={12} /></button>
          )}
          <button type="button" onClick={() => setEnabled(v => !v)} title={enabled ? 'Turn cab camera off' : 'Turn cab camera on'}
            className="text-neutral-500 hover:text-neutral-900 transition">
            {enabled ? <Camera size={13} /> : <CameraOff size={13} />}
          </button>
        </div>
      </div>

      {enabled ? (
        <>
          <div className="relative bg-black aspect-[4/3]">
            <video ref={videoRef} muted playsInline className="w-full h-full object-cover -scale-x-100" />
            {!live && (
              <div className="absolute inset-0 flex items-center justify-center text-center px-3 text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-black/60">
                {camStatus === 'starting' ? 'Starting camera…' : 'Camera blocked or unavailable'}
              </div>
            )}
            {live && m?.calibrating && face && (
              <div className="absolute bottom-1 left-1 right-1 text-center text-[9px] font-bold uppercase tracking-wider text-[#FFCD11] bg-black/70 rounded px-1 py-0.5">
                Calibrating — look straight ahead
              </div>
            )}
          </div>

          <CabMetricsPanel m={m} sem={sem} latency={latency} vlmStatus={vlmStatus} trackStatus={trackStatus} />
        </>
      ) : (
        <div className="px-3 py-3 text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Camera off — operator not monitored</div>
      )}
    </div>
  );
}
