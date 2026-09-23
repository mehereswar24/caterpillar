import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShieldAlert, Activity, BookOpen,
  Wrench, Users, TrendingUp, LogOut, Fuel, Cpu
} from 'lucide-react';
import Dashboard   from './pages/Dashboard';
import Safety      from './pages/Safety';
import Supervisor  from './pages/Supervisor';
import Anomaly     from './pages/Anomaly';
import Maintenance from './pages/Maintenance';
import Training    from './pages/Training';
import Predict     from './pages/Predict';
import FaceAuth    from './pages/FaceAuth';

const NAV = [
  { to:'/',            icon:LayoutDashboard, label:'Dashboard'     },
  { to:'/predict',     icon:TrendingUp,      label:'Task Predict'  },
  { to:'/safety',      icon:ShieldAlert,     label:'Safety Monitor'},
  { to:'/anomaly',     icon:Activity,        label:'Anomaly AI'    },
  { to:'/maintenance', icon:Wrench,          label:'Maintenance'   },
  { to:'/training',    icon:BookOpen,        label:'Training Hub'  },
  { to:'/supervisor',  icon:Users,           label:'Fleet Control' },
];

function NavItem({ to, icon: Icon, label }) {
  const { pathname } = useLocation();
  const active = pathname === to;
  return (
    <Link to={to}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative
        ${active
          ? 'bg-cat-yellow text-black font-bold shadow-cat'
          : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}>
      {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-black rounded-r-full"/>}
      <Icon size={16} className={active ? 'text-black' : 'text-gray-600 group-hover:text-cat-yellow transition-colors'}/>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}

function Sidebar({ authData, onLogout }) {
  return (
    <div className="w-56 flex-shrink-0 flex flex-col bg-cat-dark border-r border-cat-border">
      {/* CAT stripe top accent */}
      <div className="h-[3px] cat-stripe-bar w-full"/>

      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-cat-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-cat-yellow rounded-xl flex items-center justify-center shadow-cat flex-shrink-0">
            <span className="text-black font-black text-lg leading-none">C</span>
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">Smart<span className="text-cat-yellow">Operator</span></div>
            <div className="text-cat-muted text-[10px] tracking-wider uppercase">CAT 320 Assistant</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-auto">
        <div className="text-[10px] text-gray-700 font-bold uppercase tracking-widest px-3 mb-2">Operations</div>
        {NAV.slice(0,4).map(n => <NavItem key={n.to} {...n}/>)}
        <div className="text-[10px] text-gray-700 font-bold uppercase tracking-widest px-3 mt-4 mb-2">Management</div>
        {NAV.slice(4).map(n => <NavItem key={n.to} {...n}/>)}
      </nav>

      {/* Operator badge */}
      <div className="p-4 border-t border-cat-border">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-full bg-cat-yellow/20 border border-cat-yellow/40 flex items-center justify-center text-cat-yellow text-xs font-black flex-shrink-0">
            {authData?.operator?.name?.split(' ').map(n=>n[0]).join('') || 'OP'}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate">{authData?.operator?.name || 'Operator'}</div>
            <div className="text-[10px] text-cat-yellow capitalize tracking-wide">{authData?.operator?.skill || 'Active'} · {authData?.machine_id || 'EXC001'}</div>
          </div>
        </div>
        <button onClick={onLogout}
          className="w-full flex items-center gap-2 text-gray-600 hover:text-red-400 text-xs py-1.5 px-2 rounded-lg hover:bg-red-900/20 transition-all">
          <LogOut size={11}/> End Session
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [liveData, setLiveData] = useState(null);
  const [authed,   setAuthed]   = useState(false);
  const [authData, setAuthData] = useState(null);

  if (!authed) return <FaceAuth onAuthenticated={d=>{ setAuthed(true); setAuthData(d); }}/>;

  return (
    <Router>
      <div className="flex h-screen bg-cat-darker overflow-hidden text-gray-100 font-sans">
        <Sidebar authData={authData} onLogout={()=>setAuthed(false)}/>
        <main className="flex-1 overflow-auto bg-cat-radial">
          <Routes>
            <Route path="/"            element={<Dashboard    onTelemetryChange={setLiveData}/>}/>
            <Route path="/predict"     element={<Predict/>}/>
            <Route path="/safety"      element={<Safety       liveData={liveData}/>}/>
            <Route path="/anomaly"     element={<Anomaly/>}/>
            <Route path="/maintenance" element={<Maintenance/>}/>
            <Route path="/training"    element={<Training/>}/>
            <Route path="/supervisor"  element={<Supervisor/>}/>
          </Routes>
        </main>
      </div>
    </Router>
  );
}
