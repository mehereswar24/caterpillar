import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShieldAlert, Activity, BookOpen, Wrench, Users, TrendingUp, Scan, LogOut } from 'lucide-react';
import Dashboard    from './pages/Dashboard';
import Safety       from './pages/Safety';
import Supervisor   from './pages/Supervisor';
import Anomaly      from './pages/Anomaly';
import Maintenance  from './pages/Maintenance';
import Training     from './pages/Training';
import Predict      from './pages/Predict';
import FaceAuth     from './pages/FaceAuth';

function NavItem({ to, icon: Icon, label }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={"flex items-center gap-3 p-3 rounded-xl transition-all duration-200 " +
      (isActive ? 'bg-cat-yellow/10 text-cat-yellow border border-cat-yellow/20' : 'text-gray-400 hover:bg-gray-800/50 hover:text-white')}>
      <Icon size={18}/>
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
}

function App() {
  const [liveData,   setLiveData]   = useState(null);
  const [authed,     setAuthed]     = useState(false);
  const [authData,   setAuthData]   = useState(null);

  const handleAuth = (data) => { setAuthed(true); setAuthData(data); };

  if (!authed) return <FaceAuth onAuthenticated={handleAuth}/>;

  return (
    <Router>
      <div className="flex h-screen bg-[#0a0a0a] overflow-hidden text-gray-100 font-sans selection:bg-cat-yellow selection:text-black">
        {/* Sidebar */}
        <div className="w-56 bg-[#111111] p-5 flex flex-col border-r border-white/5 shadow-2xl flex-shrink-0">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-cat-yellow rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(255,184,28,0.3)] flex-shrink-0">
              <span className="text-black font-extrabold text-lg">C</span>
            </div>
            <div className="text-base font-bold tracking-tight text-white">Smart<span className="text-cat-yellow">Operator</span></div>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1">
            <NavItem to="/"            icon={LayoutDashboard} label="Dashboard"      />
            <NavItem to="/predict"     icon={TrendingUp}      label="Task Predict"   />
            <NavItem to="/safety"      icon={ShieldAlert}     label="Safety Monitor" />
            <NavItem to="/anomaly"     icon={Activity}        label="Anomaly AI"     />
            <NavItem to="/training"    icon={BookOpen}        label="Training Hub"   />
            <NavItem to="/maintenance" icon={Wrench}          label="Maintenance"    />
            <NavItem to="/supervisor"  icon={Users}           label="Fleet Control"  />
          </nav>

          {/* Operator badge */}
          <div className="mt-auto pt-5 border-t border-white/5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-full bg-cat-yellow/20 border border-cat-yellow/30 flex items-center justify-center text-cat-yellow text-xs font-bold flex-shrink-0">
                {authData?.operator?.name?.split(' ').map(n=>n[0]).join('') || 'OP'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">{authData?.operator?.name || 'Operator 001'}</div>
                <div className="text-xs text-cat-yellow capitalize">{authData?.operator?.skill || 'Active'} · {authData?.machine_id || 'EXC001'}</div>
              </div>
            </div>
            <button onClick={()=>setAuthed(false)}
              className="w-full flex items-center gap-2 text-gray-500 hover:text-red-400 text-xs py-2 px-3 rounded-lg hover:bg-red-900/20 transition-all">
              <LogOut size={12}/> End Session
            </button>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 overflow-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gray-900 via-[#0a0a0a] to-[#0a0a0a]">
          <Routes>
            <Route path="/"            element={<Dashboard onTelemetryChange={setLiveData}/>}/>
            <Route path="/predict"     element={<Predict/>}/>
            <Route path="/safety"      element={<Safety liveData={liveData}/>}/>
            <Route path="/anomaly"     element={<Anomaly/>}/>
            <Route path="/training"    element={<Training/>}/>
            <Route path="/maintenance" element={<Maintenance/>}/>
            <Route path="/supervisor"  element={<Supervisor/>}/>
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
