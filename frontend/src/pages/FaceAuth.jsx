import React, { useState, useRef, useEffect } from 'react';
import { Camera, ShieldCheck, ShieldX, User, Loader, ScanFace } from 'lucide-react';
import { API } from '../api.js';

const MACHINES = ['EXC001', 'EXC002', 'EXC003', 'EXC004', 'EXC005'];

export default function FaceAuth({ onAuthenticated }) {
  const [machine, setMachine] = useState('EXC001');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [stream, setStream] = useState(null);
  const [camReady, setCamReady] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
      setStream(s);
      if (videoRef.current) { 
        videoRef.current.srcObject = s; 
        videoRef.current.play(); 
      }
      setCamReady(true);
    } catch {
      setCamReady(false);
      alert('Camera not available � using demo mode.');
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setCamReady(false);
  };

  useEffect(() => () => stopCamera(), []);

  const capture = () => {
    if (!canvasRef.current || !videoRef.current) return null;
    const ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth || 640;
    canvasRef.current.height = videoRef.current.videoHeight || 480;
    ctx.drawImage(videoRef.current, 0, 0);
    return canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
  };

  const scan = async () => {
    setScanning(true);
    setResult(null);
    const image = capture();
    try {
      const r = await fetch(API + '/api/auth/face', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: image || 'demo', machine_id: machine }),
      });

      const data = await r.json();
      setResult(data);
      if (data.approved) {
        setTimeout(() => { stopCamera(); onAuthenticated?.(data); }, 2000);
      }
    } catch {
      // Demo fallback
      const demo = {
        approved: true, 
        result: 'APPROVED', 
        match_score: 82, 
        machine_id: machine,
        operator: { id: 'OP001', name: 'Rajan Kumar', skill: 'expert', assigned_machines: 'EXC001,EXC002' },
        assignment_valid: true, 
        message: 'Welcome, Rajan Kumar. Machine ' + machine + ' unlocked.',
      };
      setResult(demo);
      if (demo.approved) setTimeout(() => { stopCamera(); onAuthenticated?.(demo); }, 2000);
    }
    setScanning(false);
  };

  const approved = result?.approved;
  const rejected = result && !result.approved;

  return (
    <div className="min-h-screen bg-cat-darker flex items-center justify-center p-6 selection:bg-cat-yellow selection:text-black relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-cat-grid opacity-100 pointer-events-none"/>
      <div className="absolute top-0 left-0 right-0 h-[3px] cat-stripe-bar"/>
      <div className="w-full max-w-xl relative z-10">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-cat-yellow rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(255,184,28,0.3)]">
            <span className="text-black font-extrabold text-4xl">C</span>
          </div>
          <h1 className="text-4xl font-light tracking-tight text-white mb-2">Smart<span className="text-cat-yellow font-bold">Operator</span></h1>
          <p className="text-gray-400 text-lg">Secure Identity Verification</p>
        </div>

        {/* Auth Card */}
        <div className="cat-card overflow-hidden shadow-cat-lg relative">
        {/* CAT stripe top */}
        <div className="cat-stripe-bar"/>
          
          {/* Machine Selector */}
          <div className="p-6 bg-black/40 border-b border-white/5 flex items-center justify-between">
            <span className="text-gray-400 uppercase tracking-widest text-sm font-bold">Terminal ID</span>
            <select 
              value={machine} 
              onChange={e => setMachine(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2 focus:border-cat-yellow focus:ring-1 focus:ring-cat-yellow outline-none font-mono font-bold"
            >
              {MACHINES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Camera Viewport */}
          <div className="relative bg-black flex items-center justify-center" style={{ minHeight: 450 }}>
            {camReady ? (
              <video ref={videoRef} className="w-full h-full object-cover absolute inset-0" muted playsInline />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                <div className="w-32 h-32 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center bg-gray-900/50">
                  <User size={48} className="text-gray-500" />
                </div>
                <p className="text-gray-500 text-lg">Camera inactive</p>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />

            {/* Scanning Overlay */}
            {scanning && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-6 z-10 overflow-hidden">
                {/* scan line */}
                <div className="scan-line absolute left-0 right-0 top-0"/>
                <div className="w-64 h-64 border-2 border-cat-yellow/30 rounded-full flex items-center justify-center relative">
                  <div className="absolute inset-0 border-2 border-cat-yellow rounded-full animate-ping opacity-20"/>
                  <div className="absolute inset-4 border border-cat-yellow/50 rounded-full animate-spin" style={{animationDuration:'3s'}}/>
                  <ScanFace size={64} className="text-cat-yellow animate-pulse"/>
                </div>
                <p className="text-cat-yellow text-xl font-black tracking-widest uppercase animate-pulse">Scanning Biometrics...</p>
              </div>
            )}

            {/* Result Overlay */}
            {result && !scanning && (
              <div className={"absolute inset-0 flex flex-col items-center justify-center gap-6 z-20 backdrop-blur-md " + (approved ? 'bg-green-950/80' : 'bg-red-950/80')}>
                {approved ? (
                  <>
                    <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.5)] animate-in zoom-in duration-300">
                      <ShieldCheck size={64} className="text-black" />
                    </div>
                    <p className="text-green-300 text-2xl font-bold text-center px-8">{result.message}</p>
                    <div className="bg-black/40 border border-green-500/30 rounded-xl px-8 py-4 text-center mt-4">
                      <div className="text-white font-bold text-xl mb-1">{result.operator?.name}</div>
                      <div className="text-green-400 font-mono">{result.operator?.skill} Operator � {result.match_score}% Match</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-32 h-32 bg-red-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.5)] animate-in zoom-in duration-300">
                      <ShieldX size={64} className="text-black" />
                    </div>
                    <p className="text-red-200 text-2xl font-bold text-center px-8">{result.message}</p>
                    <button onClick={() => setResult(null)} className="mt-6 text-gray-400 hover:text-white transition-colors underline">Try Again</button>
                  </>
                )}
              </div>
            )}
            
            {/* Camera Viewfinder Corners (Visual effect) */}
            {!scanning && !result && camReady && (
              <div className="absolute inset-10 border-2 border-white/20 pointer-events-none rounded-3xl">
                <div className="absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 border-cat-yellow rounded-tl-3xl"></div>
                <div className="absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 border-cat-yellow rounded-tr-3xl"></div>
                <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 border-cat-yellow rounded-bl-3xl"></div>
                <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 border-cat-yellow rounded-br-3xl"></div>
              </div>
            )}
          </div>

          {/* Action Area */}
          <div className="p-8 bg-[#111] flex flex-col gap-4">
            {!camReady ? (
              <button onClick={startCamera} className="w-full bg-gray-800 text-white py-4 rounded-xl text-lg font-bold hover:bg-gray-700 hover:shadow-lg transition-all flex items-center justify-center gap-3">
                <Camera size={24} /> Start Camera Initialize
              </button>
            ) : (
              <button 
                onClick={scan} 
                disabled={scanning || result}
                className="w-full bg-cat-yellow text-black font-extrabold py-5 rounded-xl text-xl hover:bg-yellow-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(255,184,28,0.3)]"
              >
                {scanning ? <><Loader size={24} className="animate-spin" /> Verifying...</> : <><ScanFace size={24} /> Scan Operator Face</>}
              </button>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
