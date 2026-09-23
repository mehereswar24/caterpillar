import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Safety from './pages/Safety';
import Supervisor from './pages/Supervisor';
import Anomaly from './pages/Anomaly';
import Maintenance from './pages/Maintenance';
import Training from './pages/Training';

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-cat-dark overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-cat-black p-4 flex flex-col border-r border-gray-800">
          <div className="text-cat-yellow font-bold text-2xl mb-8">CAT Ops</div>
          <nav className="flex-1 space-y-2">
            <Link to="/" className="block p-3 rounded hover:bg-gray-800 text-gray-300 hover:text-white">Dashboard</Link>
            <Link to="/safety" className="block p-3 rounded hover:bg-gray-800 text-gray-300 hover:text-white">Safety</Link>
            <Link to="/anomaly" className="block p-3 rounded hover:bg-gray-800 text-gray-300 hover:text-white">Anomaly</Link>
            <Link to="/training" className="block p-3 rounded hover:bg-gray-800 text-gray-300 hover:text-white">Training</Link>
            <Link to="/maintenance" className="block p-3 rounded hover:bg-gray-800 text-gray-300 hover:text-white">Maintenance</Link>
            <Link to="/supervisor" className="block p-3 rounded hover:bg-gray-800 text-gray-300 hover:text-white">Supervisor</Link>
          </nav>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 overflow-auto text-white">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/safety" element={<Safety />} />
            <Route path="/anomaly" element={<Anomaly />} />
            <Route path="/training" element={<Training />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/supervisor" element={<Supervisor />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
