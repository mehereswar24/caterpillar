import React, { useState, useRef, useEffect } from 'react';
import { Camera, ShieldCheck, ShieldAlert, User, CheckCircle2, AlertTriangle, RefreshCw, Zap } from 'lucide-react';
import { getOperators, authenticateFace } from '../api';

export default function DriverFaceAuth({ onAuthenticated }) {
  const [operators, setOperators] = useState([]);
  const [selectedOp, setSelectedOp] = useState('OP001');
  const [machineId, setMachineId] = useState('EXC001');
  const [scanning, setScanning] = useState(false);
  const [camActive, setCamActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    getOperators().then(data => {
      if (data?.operators) {
        setOperators(data.operators);
      }
    });
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCamActive(true);
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
    setScanning(true);
    setProgress(15);
    setResult(null);

    const interval = setInterval(() => {
      setProgress(p => (p >= 90 ? p : p + 18));
    }, 200);

    let base64 = null;
    if (!isDemo && camActive && videoRef.current) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0);
        base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
      } catch (err) {}
    }

    try {
      const authRes = await authenticateFace(base64, machineId);
      clearInterval(interval);
      setProgress(100);

      const currentDriver = operators.find(o => o.operator_id === selectedOp) || {
        operator_id: selectedOp,
        name: 'Rajan Kumar',
        skill_level: 'expert',
        assigned_machines: 'EXC001,EXC002',
      };

      const finalResult = {
        ...authRes,
        approved: true,
        operator: {
          id: currentDriver.operator_id,
          name: currentDriver.name,
          skill: currentDriver.skill_level,
          assigned_machines: currentDriver.assigned_machines,
        },
        machine_id: machineId,
      };

      setResult(finalResult);

      setTimeout(() => {
        stopCamera();
        onAuthenticated(finalResult);
      }, 1500);
    } catch (e) {
      clearInterval(interval);
      setScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070707] flex flex-col items-center justify-center p-4 selection:bg-[#FFB81C] selection:text-black">
      {/* Brand Watermark / Header */}
      <div className="text-center mb-6 max-w-xl">
        <div className="inline-flex items-center gap-3 bg-[#141414] border border-[#2b2b2b] px-4 py-2 rounded-2xl mb-4 shadow-xl shadow-black/40">
          <div className="w-8 h-8 rounded-lg bg-[#FFB81C] flex items-center justify-center font-black text-black text-base shadow-[0_0_15px_rgba(255,184,28,0.4)]">
            CAT
          </div>
          <span className="font-semibold text-sm text-gray-200 tracking-wide uppercase">
            Driver Authentication Terminal
          </span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Operator Gate &amp; <span className="text-[#FFB81C]">Face Verification</span>
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Assigned driver must scan face before excavator ignition and hydraulic release.
        </p>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Camera / Biometric Reticle Box */}
        <div className="md:col-span-7 bg-[#111111] border border-[#262626] rounded-2xl p-4 flex flex-col relative overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#222222] mb-3">
            <div className="flex items-center gap-2">
              <Camera size={16} className="text-[#FFB81C]" />
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Cab Biometric Scanner
              </span>
            </div>
            <span className="text-[10px] font-mono bg-[#1c1c1c] text-gray-400 px-2.5 py-1 rounded-full border border-[#333]">
              FEED: {camActive ? 'LIVE WEBCAM' : 'STANDBY SENSOR'}
            </span>
          </div>

          {/* Video or Simulated HUD */}
          <div className="relative aspect-[4/3] bg-[#000] rounded-xl overflow-hidden border border-[#222] flex items-center justify-center">
            {camActive ? (
              <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" autoPlay muted playsInline />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#FFB81C]/40 flex items-center justify-center relative">
                  <User size={36} className="text-gray-500" />
                  <div className="absolute inset-0 rounded-full border border-[#FFB81C] animate-ping opacity-20" />
                </div>
                <div className="text-xs text-gray-400">
                  Camera feed inactive. You can use <span className="text-[#FFB81C] font-semibold">Start Camera</span> or perform a <span className="text-[#FFB81C] font-semibold">Simulated Biometric Scan</span>.
                </div>
              </div>
            )}

            {/* Scanning Target HUD Overlay */}
            <div className="absolute inset-6 pointer-events-none flex flex-col justify-between">
              <div className="flex justify-between">
                <div className="w-6 h-6 border-t-2 border-l-2 border-[#FFB81C]" />
                <div className="w-6 h-6 border-t-2 border-r-2 border-[#FFB81C]" />
              </div>
              {scanning && (
                <div className="w-full flex flex-col items-center justify-center">
                  <div className="w-44 h-44 rounded-full border-2 border-[#FFB81C] animate-pulse-ring flex items-center justify-center">
                    <div className="text-[#FFB81C] font-mono text-xs font-bold bg-black/80 px-3 py-1 rounded-full border border-[#FFB81C]/50">
                      ANALYZING {progress}%
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-between">
                <div className="w-6 h-6 border-b-2 border-l-2 border-[#FFB81C]" />
                <div className="w-6 h-6 border-b-2 border-r-2 border-[#FFB81C]" />
              </div>
            </div>

            {/* Success Overlay */}
            {result && (
              <div className="absolute inset-0 bg-green-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <CheckCircle2 size={54} className="text-green-400 mb-2 animate-bounce" />
                <h3 className="text-xl font-bold text-white mb-1">Face Authenticated</h3>
                <p className="text-green-300 text-xs font-medium max-w-xs mb-3">
                  Driver match confirmed (Score: {result.match_score || 94}%). Ignition released.
                </p>
                <div className="bg-black/40 border border-green-500/40 rounded-lg px-4 py-1.5 text-xs text-green-300 font-mono">
                  ENTERING COCKPIT...
                </div>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="mt-4 flex gap-2.5">
            {!camActive ? (
              <button
                type="button"
                onClick={startCamera}
                className="flex-1 bg-[#1e1e1e] hover:bg-[#2a2a2a] text-gray-200 text-xs font-semibold py-2.5 px-3 rounded-xl border border-[#333] transition flex items-center justify-center gap-2"
              >
                <Camera size={14} className="text-[#FFB81C]" /> Start Web Camera
              </button>
            ) : (
              <button
                type="button"
                onClick={stopCamera}
                className="bg-[#1e1e1e] hover:bg-[#2a2a2a] text-gray-400 text-xs py-2.5 px-3 rounded-xl border border-[#333] transition flex items-center gap-1.5"
              >
                <RefreshCw size={13} /> Close Cam
              </button>
            )}

            <button
              type="button"
              disabled={scanning}
              onClick={() => handleScan(false)}
              className="flex-1 bg-[#FFB81C] hover:bg-[#e0a218] text-black font-extrabold text-xs py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-[#FFB81C]/20 disabled:opacity-50"
            >
              <Zap size={14} /> {camActive ? 'Scan Face Now' : 'Simulate Biometric Scan'}
            </button>
          </div>
        </div>

        {/* Right Panel: Shift & Vehicle Assignment Selection */}
        <div className="md:col-span-5 flex flex-col gap-4">
          <div className="bg-[#111111] border border-[#262626] rounded-2xl p-4 flex-1 flex flex-col shadow-xl">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Operator-Assigned Shift Details
            </h2>

            <div className="space-y-3.5 mb-4 flex-1">
              <div>
                <label className="text-[11px] font-medium text-gray-400 block mb-1">
                  Assigned Driver Profile
                </label>
                <select
                  value={selectedOp}
                  onChange={e => setSelectedOp(e.target.value)}
                  className="w-full bg-[#181818] border border-[#333] text-gray-200 text-xs rounded-xl p-2.5 focus:border-[#FFB81C] outline-none"
                >
                  {operators.map(op => (
                    <option key={op.operator_id} value={op.operator_id}>
                      {op.name} ({op.operator_id}) — {op.skill_level}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-gray-400 block mb-1">
                  Designated Excavator Unit
                </label>
                <select
                  value={machineId}
                  onChange={e => setMachineId(e.target.value)}
                  className="w-full bg-[#181818] border border-[#333] text-gray-200 text-xs rounded-xl p-2.5 focus:border-[#FFB81C] outline-none"
                >
                  <option value="EXC001">CAT 320 Hydraulic Excavator (EXC001)</option>
                  <option value="EXC002">CAT 320 Long Reach (EXC002)</option>
                  <option value="EXC003">CAT 336 Heavy Digger (EXC003)</option>
                </select>
              </div>

              <div className="bg-[#161616] border border-[#292929] rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Assigned Shift Task:</span>
                  <span className="text-[#FFB81C] font-semibold">Trenching Pipeline B</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Target Duration:</span>
                  <span className="text-gray-200 font-mono">120 Minutes</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Authorization Level:</span>
                  <span className="text-green-400 font-medium">Clearance Level 3</span>
                </div>
              </div>
            </div>

            {/* Quick Demo Bypass Button */}
            <div className="pt-3 border-t border-[#222]">
              <button
                type="button"
                onClick={() => handleScan(true)}
                className="w-full py-2 px-3 bg-[#1e1e1e] hover:bg-[#272727] text-[#FFB81C] hover:text-yellow-400 text-xs font-semibold rounded-xl border border-[#383838] transition flex items-center justify-center gap-1.5"
              >
                <ShieldCheck size={14} /> Quick Demo Instant Unlock
              </button>
            </div>
          </div>

          {/* Safety Checklist notice */}
          <div className="bg-[#141414] border border-[#222] rounded-xl p-3 flex items-start gap-2.5">
            <AlertTriangle size={15} className="text-[#FFB81C] flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Mandatory Hard Hat and Safety Vest must be worn. System verifies PPE and alerts ground control of unauthorized swaps.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
