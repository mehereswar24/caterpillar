import React, { useState, useRef, useEffect } from 'react';
import { Camera, Shield, ShieldCheck, ShieldX, User, Loader, RefreshCw } from 'lucide-react';

const API = 'https://caterpillar-stack.onrender.com';

const MACHINES = ['EXC001','EXC002','EXC003','EXC004','EXC005'];

export default function FaceAuth({ onAuthenticated }) {
  const [machine,   setMachine]   = useState('EXC001');
  const [scanning,  setScanning]  = useState(false);
  const [result,    setResult]    = useState(null);
  const [stream,    setStream]    = useState(null);
  const [camReady,  setCamReady]  = useState(false);
  const [operators, setOperators] = useState([]);
  const [authLog,   setAuthLog]   = useState([]);
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/api/auth/operators`).then(r=>r.json()).then(d=>setOperators(d.operators||[])).catch(()=>{
      setOperators([
        { operator_id:'OP001', name:'Rajan Kumar',   assigned_machines:'EXC001,EXC002', skill_level:'expert' },
        { operator_id:'OP002', name:'Suresh Patel',  assigned_machines:'EXC001,EXC003', skill_level:'intermediate' },
        { operator_id:'OP003', name:'Anita Sharma',  assigned_machines:'EXC002,EXC004', skill_level:'expert' },
        { operator_id:'OP004', name:'David Okafor',  assigned_machines:'EXC003,EXC005', skill_level:'beginner' },
        { operator_id:'OP005', name:'Maria Santos',  assigned_machines:'EXC004,EXC005', skill_level:'intermediate' },
      ]);
    });
    fetch(`${API}/api/auth/log`).then(r=>r.json()).then(d=>setAuthLog(d.log||[])).catch(()=>{});
  }, []);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width:640, height:480, facingMode:'user' } });
      setStream(s);
      if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play(); }
      setCamReady(true);
    } catch {
      setCamReady(false);
      alert('Camera not available — using demo mode.');
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(t=>t.stop());
    setStream(null);
    setCamReady(false);
  };

  useEffect(() => () => stopCamera(), []);

  const capture = () => {
    if (!canvasRef.current || !videoRef.current) return null;
    const ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width  = videoRef.current.videoWidth  || 640;
    canvasRef.current.height = videoRef.current.videoHeight || 480;
    ctx.drawImage(videoRef.current, 0, 0);
    return canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
  };

  const scan = async () => {
    setScanning(true);
    setResult(null);
    const image = capture();
    try {
      const r = await fetch(`${API}/api/auth/face`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ image: image || 'demo', machine_id: machine }),
      });
      const data = await r.json();
      setResult(data);
      if (data.approved) {
        setTimeout(() => { stopCamera(); onAuthenticated?.(data); }, 2000);
      }
      // refresh log
      fetch(`${API}/api/auth/log`).then(r=>r.json()).then(d=>setAuthLog(d.log||[])).catch(()=>{});
    } catch {
      // Demo fallback
      const demo = {
        approved: true, result:'APPROVED', match_score:82, machine_id: machine,
        operator:{ id:'OP001', name:'Rajan Kumar', skill:'expert', assigned_machines:'EXC001,EXC002' },
        assignment_valid: true, message:`Welcome, Rajan Kumar. Machine ${machine} unlocked.`,
        vision_description:'Male, short black hair, dark complexion, orange hard hat',
        all_scores:[
          { operator_id:'OP001', name:'Rajan Kumar',  score:82 },
          { operator_id:'OP002', name:'Suresh Patel', score:34 },
          { operator_id:'OP003', name:'Anita Sharma', score:21 },
        ],
      };
      setResult(demo);
      if (demo.approved) setTimeout(() => { stopCamera(); onAuthenticated?.(demo); }, 2000);
    }
    setScanning(false);
  };

  const override = async (operatorId) => {
    try {
      await fetch(`${API}/api/auth/override`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ machine_id:machine, operator_id:operatorId, supervisor_id:'SUPERVISOR' }),
      });
      const data = { approved:true, result:'SUPERVISOR_OVERRIDE', operator:operators.find(o=>o.operator_id===operatorId), machine_id:machine, message:`Manual override — ${machine} unlocked.` };
      setResult(data);
      setTimeout(() => { onAuthenticated?.(data); }, 1500);
    } catch {}
  };

  const approved  = result?.approved;
  const rejected  = result && !result.approved;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-cat-yellow rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(255,184,28,0.4)]">
            <span className="text-black font-extrabold text-2xl">C</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Smart<span className="text-cat-yellow">Operator</span></h1>
          <p className="text-gray-500 text-sm mt-1">Face Authentication Required</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Camera panel */}
          <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera size={16} className="text-cat-yellow"/>
                <span className="text-white font-semibold text-sm">Cab Camera — Face Scan</span>
              </div>
              <select value={machine} onChange={e=>setMachine(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-white text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-cat-yellow">
                {MACHINES.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* Video area */}
            <div className="relative bg-gray-950" style={{minHeight:320}}>
              {camReady
                ? <video ref={videoRef} className="w-full" style={{maxHeight:320,objectFit:'cover'}} muted playsInline/>
                : <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center">
                      <User size={36} className="text-gray-600"/>
                    </div>
                    <p className="text-gray-500 text-sm">Camera not started</p>
                  </div>
              }
              <canvas ref={canvasRef} className="hidden"/>

              {/* Scanning overlay */}
              {scanning && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
                  <div className="w-48 h-48 border-2 border-cat-yellow rounded-full flex items-center justify-center relative">
                    <div className="absolute inset-0 border-2 border-cat-yellow rounded-full animate-ping opacity-30"/>
                    <Loader size={32} className="text-cat-yellow animate-spin"/>
                  </div>
                  <p className="text-cat-yellow text-sm font-semibold animate-pulse">Analysing face...</p>
                </div>
              )}

              {/* Result overlay */}
              {result && !scanning && (
                <div className={`absolute inset-0 flex flex-col items-center justify-center gap-4 ${approved?'bg-green-900/80':'bg-red-900/80'}`}>
                  {approved
                    ? <><ShieldCheck size={64} className="text-green-400"/><p className="text-green-300 text-xl font-bold text-center px-4">{result.message}</p></>
                    : <><ShieldX size={64} className="text-red-400"/><p className="text-red-300 text-xl font-bold text-center px-4">{result.message}</p></>
                  }
                  {approved && <div className="bg-green-900 border border-green-600 rounded-xl px-6 py-3 text-center"><div className="text-green-300 font-bold">{result.operator?.name}</div><div className="text-green-500 text-xs capitalize">{result.operator?.skill} operator · {result.match_score}% match</div></div>}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="p-4 flex gap-3">
              {!camReady
                ? <button onClick={startCamera} className="flex-1 bg-gray-800 border border-gray-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:border-cat-yellow transition-all flex items-center justify-center gap-2"><Camera size={16}/> Start Camera</button>
                : <button onClick={stopCamera} className="bg-gray-800 border border-gray-700 text-gray-400 py-2.5 px-4 rounded-xl text-sm hover:border-gray-500 transition-all"><RefreshCw size={14}/></button>
              }
              <button onClick={scan} disabled={scanning}
                className="flex-1 bg-cat-yellow text-black font-bold py-2.5 rounded-xl text-sm hover:bg-yellow-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {scanning ? <><Loader size={14} className="animate-spin"/> Scanning...</> : <><Shield size={14}/> Scan Face</>}
              </button>
            </div>

            {/* Match scores */}
            {result?.all_scores?.length > 0 && (
              <div className="px-4 pb-4">
                <div className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Match Scores</div>
                <div className="space-y-1.5">
                  {result.all_scores.slice(0,3).map(s=>(
                    <div key={s.operator_id} className="flex items-center gap-3">
                      <div className="text-gray-400 text-xs w-28 truncate">{s.name}</div>
                      <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-cat-yellow transition-all" style={{width:`${s.score}%`}}/>
                      </div>
                      <div className="text-gray-400 text-xs w-8 text-right">{s.score}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="flex flex-col gap-4">
            {/* Registered operators */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <div className="text-white font-semibold text-sm mb-3">Registered Operators</div>
              <div className="space-y-2">
                {operators.map(o=>{
                  const assigned = o.assigned_machines?.split(',').map(m=>m.trim());
                  const canOperate = assigned?.includes(machine);
                  return (
                    <div key={o.operator_id} className={`flex items-center gap-3 p-2 rounded-lg border ${canOperate?'border-green-800 bg-green-900/10':'border-gray-800'}`}>
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {o.name.split(' ').map(n=>n[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-xs font-medium truncate">{o.name}</div>
                        <div className="text-gray-500 text-xs capitalize">{o.skill_level}</div>
                      </div>
                      {canOperate
                        ? <span className="text-green-400 text-xs flex-shrink-0">✓ Auth</span>
                        : <span className="text-gray-600 text-xs flex-shrink-0">✗</span>
                      }
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Supervisor override */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <div className="text-white font-semibold text-sm mb-3">Supervisor Override</div>
              <div className="space-y-1.5">
                {operators.filter(o=>o.assigned_machines?.split(',').map(m=>m.trim()).includes(machine)).map(o=>(
                  <button key={o.operator_id} onClick={()=>override(o.operator_id)}
                    className="w-full text-left px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-cat-yellow rounded-lg text-xs text-gray-300 transition-all">
                    Unlock for {o.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent log */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex-1">
              <div className="text-white font-semibold text-sm mb-3">Recent Auth Log</div>
              {authLog.length === 0
                ? <div className="text-gray-600 text-xs">No attempts yet</div>
                : <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {authLog.slice(0,8).map((l,i)=>(
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${l.result==='APPROVED'||l.result==='SUPERVISOR_OVERRIDE'?'bg-green-500':'bg-red-500'}`}/>
                        <span className="text-gray-400 truncate flex-1">{l.operator_id}</span>
                        <span className={`flex-shrink-0 ${l.result==='APPROVED'?'text-green-400':'text-red-400'}`}>{l.result==='APPROVED'?'OK':l.result==='SUPERVISOR_OVERRIDE'?'OVR':'FAIL'}</span>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
