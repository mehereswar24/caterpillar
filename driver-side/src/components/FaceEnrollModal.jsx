import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, Loader2, CheckCircle2, AlertTriangle, Trash2, ScanFace } from 'lucide-react';
import { enrollFace, removeFace, AuthError } from '../services/supervisorApi';

// Captured automatically, one prompt at a time, so the samples cover a little natural variation.
const STEPS = [
  'Look straight at the camera',
  'Look straight at the camera',
  'Turn your head slightly left',
  'Turn your head slightly right',
  'Tilt your chin up a little',
  'Look straight and relax',
];
const STEP_MS = 1100;

// Supervisor tool: photograph an operator and store their face so the cab login can recognise them.
export default function FaceEnrollModal({ operator, onClose, onChanged, onAuthError }) {
  const [phase, setPhase] = useState('idle');   // idle | capturing | uploading | done | error
  const [step, setStep] = useState(0);
  const [msg, setMsg] = useState('');
  const [camOn, setCamOn] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const cancelRef = useRef(false);

  const stopCamera = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; setCamOn(false); };
  useEffect(() => () => { cancelRef.current = true; stopCamera(); }, []);

  // attach the stream once the <video> exists
  useEffect(() => {
    const v = videoRef.current;
    if (camOn && v && streamRef.current) { v.srcObject = streamRef.current; v.play().catch(() => {}); }
  }, [camOn]);

  const startCamera = async () => {
    setMsg('');
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
      setCamOn(true);
    } catch { setMsg('Camera blocked or unavailable.'); setPhase('error'); }
  };

  const grab = () => {
    const v = videoRef.current;
    if (!v?.videoWidth) return null;
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    return c.toDataURL('image/jpeg', 0.9);
  };

  const enroll = async () => {
    cancelRef.current = false;
    setPhase('capturing'); setMsg('');
    const images = [];
    for (let i = 0; i < STEPS.length; i++) {
      if (cancelRef.current) return;
      setStep(i);
      await new Promise(r => setTimeout(r, STEP_MS));
      const f = grab();
      if (f) images.push(f);
    }
    if (cancelRef.current) return;
    setPhase('uploading');
    try {
      const r = await enrollFace(operator.operator_id, images);
      setPhase('done'); setMsg(`Face enrolled — ${r.samples} samples saved. ${operator.name} can now sign in with their face.`);
      stopCamera(); onChanged?.();
    } catch (e) {
      if (e instanceof AuthError) { onAuthError?.(); return; }
      setPhase('error'); setMsg(e.message || 'Enrollment failed.');
    }
  };

  const remove = async () => {
    try { await removeFace(operator.operator_id); setMsg('Face data removed.'); setPhase('idle'); onChanged?.(); }
    catch (e) { if (e instanceof AuthError) onAuthError?.(); else { setPhase('error'); setMsg(e.message); } }
  };

  const busy = phase === 'capturing' || phase === 'uploading';
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
      <div className="w-full max-w-md bg-[#ffffff] border border-[#e6e6e1] rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e6e6e1]">
          <div className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
            <ScanFace size={16} /> Face ID · {operator.name} <span className="text-neutral-500 font-mono font-normal text-xs">{operator.operator_id}</span>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="text-neutral-600 hover:text-neutral-900 p-1 disabled:opacity-40" title="Close"><X size={16} /></button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-xs text-neutral-600 leading-relaxed">
            {operator.face_samples
              ? <>Currently enrolled with <b>{operator.face_samples}</b> samples. Enrolling again replaces them.</>
              : <>No face enrolled yet, so this operator can&apos;t sign in by face.</>}
            {' '}Only the operator should be in front of the camera, in good light, without a hat or sunglasses.
          </p>

          <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden">
            {camOn
              ? <video ref={videoRef} muted playsInline className="w-full h-full object-cover -scale-x-100" />
              : <div className="absolute inset-0 flex items-center justify-center text-xs text-neutral-400">Camera off</div>}
            {phase === 'capturing' && (
              <div className="absolute bottom-2 left-2 right-2 bg-black/75 text-white text-sm font-medium rounded-lg px-3 py-1.5 text-center">
                {STEPS[step]} <span className="text-neutral-400 text-xs">({step + 1}/{STEPS.length})</span>
              </div>
            )}
            {phase === 'uploading' && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 text-white text-sm"><Loader2 size={16} className="animate-spin" /> Reading face…</div>
            )}
          </div>

          {msg && (
            <div className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 border ${phase === 'done' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800' : 'bg-red-500/10 border-red-500/30 text-red-700'}`}>
              {phase === 'done' ? <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" /> : <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />}
              <span>{msg}</span>
            </div>
          )}

          <div className="flex gap-2">
            {!camOn ? (
              <button type="button" onClick={startCamera} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-neutral-900 text-white rounded-lg py-2 hover:bg-black transition">
                <Camera size={14} /> Start camera
              </button>
            ) : (
              <button type="button" onClick={enroll} disabled={busy} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-neutral-900 text-white rounded-lg py-2 hover:bg-black transition disabled:opacity-50">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <ScanFace size={14} />} {busy ? 'Capturing…' : operator.face_samples ? 'Re-enroll face' : 'Enroll face'}
              </button>
            )}
            {operator.face_samples > 0 && (
              <button type="button" onClick={remove} disabled={busy} title="Delete this operator's face data"
                className="flex items-center gap-1.5 text-xs font-medium text-red-700 border border-red-500/30 hover:bg-red-500/10 rounded-lg px-3 py-2 transition disabled:opacity-50">
                <Trash2 size={14} /> Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
