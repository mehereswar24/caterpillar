import CatLogo from './CatLogo';
import React, { useState, useRef, useEffect } from 'react';
import { Camera, ShieldCheck, ShieldAlert, User, CheckCircle2, AlertTriangle, RefreshCw, Zap, Lock, ArrowRight } from 'lucide-react';
import { authenticateFace, getAssignedTasks } from '../api';

// This terminal is installed in one machine; the face decides WHO the operator is.
const TERMINAL_MACHINE = 'EXC001';
const MACHINE_NAMES = { EXC001: 'CAT 320 Hydraulic Excavator', EXC002: 'CAT 320 Long Reach', EXC003: 'CAT 336 Heavy Digger', EXC004: 'CAT 320 Excavator', EXC005: 'CAT 320 Excavator' };
const CLEARANCE = { expert: 3, intermediate: 2, beginner: 1 };
const DEMO_OPERATOR = { id: 'OP001', name: 'Rajan Kumar', skill: 'expert', assigned_machines: 'EXC001,EXC002' };
const ENTER_DELAY_S = 6;   // time to read the shift details before the cockpit opens

export default function DriverFaceAuth({ onAuthenticated }) {
  const [scanning, setScanning] = useState(false);
  const [camActive, setCamActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [denied, setDenied] = useState(null);   // last rejected scan (server response or local error)
  const [countdown, setCountdown] = useState(null);   // seconds until the cockpit opens after a successful scan
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const enterRef = useRef(null);

  // Attach the stream once the <video> element exists (it is only rendered while camActive)
  useEffect(() => {
    const v = videoRef.current;
    if (camActive && v && streamRef.current) {
      v.srcObject = streamRef.current;
      v.play().catch(() => {});
    }
  }, [camActive]);

  // Release the camera if this screen unmounts (e.g. after login)
  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); clearInterval(enterRef.current); }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      streamRef.current = stream;
      setCamActive(true);   // the <video> only mounts now; the effect below attaches the stream to it
    } catch (e) {
      console.warn('Webcam permission not granted or unavailable, switching to simulator preview.');
      setCamActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCamActive(false);
  };

  const handleScan = async (isDemo = false) => {
    if (!isDemo && !(camActive && videoRef.current)) {
      setDenied({ message: 'Start the web camera first — the face scan needs a live image.' });
      return;
    }
    setScanning(true);
    setProgress(15);
    setResult(null);
    setDenied(null);

    const interval = setInterval(() => {
      setProgress(p => Math.min(90, p + 18));
    }, 200);

    let base64 = null;
    if (!isDemo) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0);
        base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
      } catch (err) {}
      if (!base64) {
        clearInterval(interval);
        setScanning(false); setProgress(0);
        setDenied({ message: 'Could not read an image from the camera. Try again.' });
        return;
      }
    }

    try {
      // Quick Demo Instant Unlock is an explicit bypass; everything else must pass the face check.
      const authRes = isDemo
        ? { approved: true, demo: true, match_score: 100 }
        : await authenticateFace(base64, TERMINAL_MACHINE);
      clearInterval(interval);

      if (!authRes.approved) {
        setScanning(false); setProgress(0);
        setDenied(authRes);
        return;
      }
      setProgress(100);

      // The operator is whoever the FACE matched (server). Demo unlock has no face, so it uses a default profile.
      const operator = authRes.operator || DEMO_OPERATOR;
      const tasks = await getAssignedTasks(TERMINAL_MACHINE, operator.id).catch(() => []);
      const t = tasks?.[0];

      const finalResult = {
        ...authRes,
        approved: true,
        operator,
        machine_id: TERMINAL_MACHINE,
        task: t ? { id: t.task_id, name: t.task_type, estimatedMin: t.estimated_time, weather: t.weather, soil: t.soil_type } : null,
      };

      setScanning(false);
      setResult(finalResult);
      stopCamera();
      // give the operator time to read their details, then open the cockpit (or click "Enter Cockpit")
      let left = ENTER_DELAY_S;
      setCountdown(left);
      enterRef.current = setInterval(() => {
        left -= 1;
        setCountdown(left);
        if (left <= 0) { clearInterval(enterRef.current); onAuthenticated(finalResult); }
      }, 1000);
    } catch (e) {
      clearInterval(interval);
      setScanning(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 w-full bg-[#f5f5f2] flex flex-col items-center justify-center px-4 py-2 selection:bg-[#FFCD11] selection:text-black">
      {/* Brand Watermark / Header */}
      <div className="text-center mb-2 max-w-xl">
        <div className="inline-flex items-center gap-3 bg-[#ffffff] border border-[#e6e6e1] px-3 py-1 rounded-xl mb-1.5 shadow-md shadow-black/10">
          <CatLogo height={24} />
          <span className="font-semibold text-sm text-neutral-800 tracking-wide uppercase">
            Driver Authentication Terminal
          </span>
        </div>
        <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight">
          Operator Gate &amp; <span className="text-neutral-900">Face Verification</span>
        </h1>
        <p className="text-neutral-600 text-xs mt-0.5">
          Assigned driver must scan face before excavator ignition and hydraulic release.
        </p>
      </div>

      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-12 gap-3 min-h-0">
        {/* Camera / Biometric Reticle Box */}
        <div className="md:col-span-7 bg-[#ffffff] border border-[#e6e6e1] rounded-2xl p-3 flex flex-col relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-[#e6e6e1] mb-2">
            <div className="flex items-center gap-2">
              <Camera size={16} className="text-neutral-900" />
              <span className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                Cab Biometric Scanner
              </span>
            </div>
            <span className="text-[10px] font-mono bg-[#f0f0ec] text-neutral-600 px-2.5 py-1 rounded-full border border-[#e6e6e1]">
              FEED: {camActive ? 'LIVE WEBCAM' : 'STANDBY SENSOR'}
            </span>
          </div>

          {/* Video or Simulated HUD */}
          <div className="relative aspect-[4/3] max-h-[34vh] w-full mx-auto bg-[#f5f5f2] rounded-xl overflow-hidden border border-[#e6e6e1] flex items-center justify-center">
            {camActive ? (
              <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" autoPlay muted playsInline />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#FFCD11]/40 flex items-center justify-center relative">
                  <User size={36} className="text-neutral-500" />
                  <div className="absolute inset-0 rounded-full border border-[#FFCD11] animate-ping opacity-20" />
                </div>
                <div className="text-xs text-neutral-600">
                  Camera feed inactive. Use <span className="text-neutral-900 font-semibold">Start Web Camera</span>, then scan your face to unlock.
                </div>
              </div>
            )}

            {/* Scanning Target HUD Overlay */}
            <div className="absolute inset-6 pointer-events-none flex flex-col justify-between">
              <div className="flex justify-between">
                <div className="w-6 h-6 border-t-2 border-l-2 border-[#FFCD11]" />
                <div className="w-6 h-6 border-t-2 border-r-2 border-[#FFCD11]" />
              </div>
              {scanning && (
                <div className="w-full flex flex-col items-center justify-center">
                  <div className="w-44 h-44 rounded-full border-2 border-[#FFCD11] animate-pulse-ring flex items-center justify-center">
                    <div className="text-neutral-900 font-mono text-xs font-bold bg-white/90 px-3 py-1 rounded-full border border-[#FFCD11]/50">
                      ANALYZING {progress}%
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-between">
                <div className="w-6 h-6 border-b-2 border-l-2 border-[#FFCD11]" />
                <div className="w-6 h-6 border-b-2 border-r-2 border-[#FFCD11]" />
              </div>
            </div>

            {/* Denied Overlay */}
            {denied && !result && (
              <div className="absolute inset-0 bg-red-50 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <ShieldAlert size={50} className="text-red-600 mb-2" />
                <h3 className="text-xl font-bold text-neutral-900 mb-1">Access Denied</h3>
                <p className="text-red-800 text-xs font-medium max-w-xs mb-3">
                  {denied.message || 'Face not recognised. Machine remains locked.'}
                </p>
                <button type="button" onClick={() => setDenied(null)}
                  className="bg-black/40 hover:bg-black/60 border border-red-500/40 rounded-lg px-4 py-1.5 text-xs text-red-800 font-semibold">
                  Try again
                </button>
              </div>
            )}

            {/* Success Overlay */}
            {result && (
              <div className="absolute inset-0 bg-green-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <CheckCircle2 size={54} className="text-green-600 mb-2 animate-bounce" />
                <h3 className="text-xl font-bold text-neutral-900 mb-1">Face Authenticated</h3>
                <p className="text-green-700 text-xs font-medium max-w-xs mb-3">
                  {result.demo ? 'Demo unlock — face check skipped.' : `Welcome, ${result.operator.name}. Match score ${result.match_score}%.`}
                </p>
                <div className="bg-black/40 border border-green-500/40 rounded-lg px-4 py-1.5 text-xs text-green-700 font-mono">
                  IGNITION RELEASED
                </div>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="mt-2 flex gap-2">
            {!camActive ? (
              <button
                type="button"
                onClick={startCamera}
                className="flex-1 bg-[#f0f0ec] hover:bg-[#f0f0ec] text-neutral-800 text-xs font-semibold py-2 px-3 rounded-xl border border-[#e6e6e1] transition flex items-center justify-center gap-2"
              >
                <Camera size={14} className="text-neutral-900" /> Start Web Camera
              </button>
            ) : (
              <button
                type="button"
                onClick={stopCamera}
                className="bg-[#f0f0ec] hover:bg-[#f0f0ec] text-neutral-600 text-xs py-2 px-3 rounded-xl border border-[#e6e6e1] transition flex items-center gap-1.5"
              >
                <RefreshCw size={13} /> Close Cam
              </button>
            )}

            <button
              type="button"
              disabled={scanning || !camActive}
              onClick={() => handleScan(false)}
              className="flex-1 bg-neutral-900 hover:bg-[#e0a218] text-white font-extrabold text-xs py-2 px-4 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg  disabled:opacity-50"
            >
              <Zap size={14} /> {camActive ? 'Scan Face Now' : 'Start camera to scan'}
            </button>
          </div>
        </div>

        {/* Right Panel: operator identity + shift details, revealed by the biometric scan */}
        <div className="md:col-span-5 flex flex-col gap-3 min-h-0">
          <div className="bg-[#ffffff] border border-[#e6e6e1] rounded-2xl p-3 flex-1 flex flex-col shadow-lg">
            <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">
              Operator &amp; Shift Details
            </h2>

            {result ? (
              <div className="space-y-2 flex-1 animate-fade-in">
                <div className="flex items-center gap-3 bg-[#ffffff] border border-green-500/30 rounded-xl p-3">
                  <div className="w-11 h-11 rounded-xl bg-green-500/15 border border-green-500/40 text-green-600 flex items-center justify-center flex-shrink-0">
                    <User size={22} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-neutral-900 font-bold text-base leading-tight truncate">{result.operator.name}</div>
                    <div className="text-[11px] text-neutral-600 font-mono">{result.operator.id} · <span className="capitalize">{result.operator.skill}</span> operator</div>
                  </div>
                  <span className="ml-auto text-[10px] font-black uppercase tracking-wider text-green-600 bg-green-500/10 border border-green-500/30 rounded-full px-2 py-0.5 flex-shrink-0">
                    {result.demo ? 'Demo' : `${result.match_score}% match`}
                  </span>
                </div>

                <div className="bg-[#ffffff] border border-[#e6e6e1] rounded-xl p-2.5 space-y-1">
                  {[
                    ['Designated Unit', `${MACHINE_NAMES[result.machine_id] || 'CAT Excavator'} (${result.machine_id})`, 'text-neutral-900'],
                    ['Authorised Units', (result.operator.assigned_machines || '').split(',').join(', ') || '—', 'text-neutral-800 font-mono'],
                    ['Assigned Shift Task', result.task?.name || 'No task assigned', 'text-neutral-900 font-semibold'],
                    ['Target Duration', result.task?.estimatedMin ? `${result.task.estimatedMin} minutes` : '—', 'text-neutral-800 font-mono'],
                    ['Site Conditions', [result.task?.weather, result.task?.soil].filter(Boolean).join(' · ') || '—', 'text-neutral-700'],
                    ['Authorization Level', `Clearance Level ${CLEARANCE[result.operator.skill] || 1}`, 'text-green-600 font-medium'],
                  ].map(([k, v, cls]) => (
                    <div key={k} className="flex items-start justify-between gap-3 text-xs">
                      <span className="text-neutral-600 flex-shrink-0">{k}:</span>
                      <span className={`text-right ${cls}`}>{v}</span>
                    </div>
                  ))}
                </div>

                <button type="button" onClick={() => { clearInterval(enterRef.current); onAuthenticated(result); }}
                  className="w-full bg-neutral-900 hover:bg-[#e0a218] text-white font-extrabold text-xs py-2 px-4 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg ">
                  Enter Cockpit{countdown > 0 ? ` (${countdown}s)` : ''} <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-1.5 py-2 text-neutral-500">
                <div className="w-14 h-14 rounded-full border-2 border-dashed border-[#e6e6e1] flex items-center justify-center">
                  <Lock size={22} />
                </div>
                <div className="text-xs font-semibold text-neutral-600">Shift details locked</div>
                <div className="text-[11px] max-w-[220px] leading-relaxed">
                  Scan your face to verify who you are. Your assigned unit, task and clearance appear here once you're identified.
                </div>
              </div>
            )}

            {/* Quick Demo Bypass Button */}
            {!result && (
              <div className="pt-2 border-t border-[#e6e6e1] mt-2">
                <button
                  type="button"
                  onClick={() => handleScan(true)}
                  className="w-full py-2 px-3 bg-[#f0f0ec] hover:bg-[#f0f0ec] text-neutral-900 hover:text-amber-600 text-xs font-semibold rounded-xl border border-[#e6e6e1] transition flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck size={14} /> Quick Demo Instant Unlock
                </button>
              </div>
            )}
          </div>

          {/* Safety Checklist notice */}
          <div className="hidden [@media(min-height:780px)]:flex bg-[#ffffff] border border-[#e6e6e1] rounded-xl p-2 items-start gap-2">
            <AlertTriangle size={15} className="text-neutral-900 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-neutral-600 leading-relaxed">
              Mandatory Hard Hat and Safety Vest must be worn. System verifies PPE and alerts ground control of unauthorized swaps.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
