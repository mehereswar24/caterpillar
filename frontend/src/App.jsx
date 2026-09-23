import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShieldAlert, Activity, BookOpen, Wrench, Users } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Safety from './pages/Safety';
import Supervisor from './pages/Supervisor';
import Anomaly from './pages/Anomaly';
import Maintenance from './pages/Maintenance';
import Training from './pages/Training';

function NavItem({ to, icon: Icon, label }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={"flex items-center gap-3 p-3 rounded-xl transition-all duration-300 " + (isActive ? 'bg-cat-yellow/10 text-cat-yellow border border-cat-yellow/20 shadow-[0_0_10px_rgba(255,184,28,0.1)]' : 'text-gray-400 hover:bg-gray-800/50 hover:text-white')}>
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </Link>
  );
}

function App() {
  const [liveData, setLiveData] = useState(null);

  return (
    <Router>
      <div className="flex h-screen bg-[#0a0a0a] overflow-hidden text-gray-100 font-sans selection:bg-cat-yellow selection:text-black">
        <div className="w-64 bg-[#111111] p-6 flex flex-col border-r border-white/5 relative z-10 shadow-2xl">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-cat-yellow rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(255,184,28,0.3)]">
              <span className="text-black font-extrabold text-xl">C</span>
            </div>
            <div className="text-xl font-bold tracking-tight text-white">Smart<span className="text-cat-yellow">Operator</span></div>
          </div>
          <nav className="flex-1 space-y-2">
            <NavItem to="/"           icon={LayoutDashboard} label="Dashboard" />
            <NavItem to="/safety"     icon={ShieldAlert}     label="Safety Monitor" />
            <NavItem to="/anomaly"    icon={Activity}        label="Anomaly AI" />
            <NavItem to="/training"   icon={BookOpen}        label="Training Hub" />
            <NavItem to="/maintenance" icon={Wrench}         label="Maintenance" />
            <NavItem to="/supervisor" icon={Users}           label="Fleet Control" />
          </nav>
          <div className="mt-auto pt-6 border-t border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 border border-white/10" />
              <div>
                <div className="text-sm font-semibold">Operator 001</div>
                <div className="text-xs text-cat-yellow">Active Shift</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gray-900 via-[#0a0a0a] to-[#0a0a0a]">
          <Routes>
            <Route path="/"            element={<Dashboard onTelemetryChange={setLiveData} />} />
            <Route path="/safety"      element={<Safety liveData={liveData} />} />
            <Route path="/anomaly"     element={<Anomaly />} />
            <Route path="/training"    element={<Training />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/supervisor"  element={<Supervisor />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
export default App;
