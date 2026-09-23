import React, { useState } from 'react';
import { BookOpen, Gamepad2, PlayCircle, CheckCircle, Lock, Award, TrendingUp, Sparkles, MessageSquare, ArrowLeft } from 'lucide-react';

const modules = [
  {
    id: 1,
    title: "Proximity Safety",
    type: "Simulation",
    icon: Gamepad2,
    progress: 60,
    status: "In Progress",
    description: "Practice operating near ground workers using the interactive 3D simulator.",
    color: "text-cat-yellow",
    material: (
      <div className="bg-black/50 border border-cat-yellow/30 rounded-2xl p-10 text-center relative overflow-hidden shadow-2xl mt-4">
         <div className="absolute inset-0 bg-gray-900 opacity-40 bg-cover bg-center"></div>
         <Gamepad2 className="w-20 h-20 text-cat-yellow mx-auto mb-6 relative z-10 animate-bounce" />
         <h4 className="text-3xl font-bold text-white mb-4 relative z-10">3D Simulation Environment</h4>
         <p className="text-gray-300 mb-8 max-w-2xl mx-auto relative z-10 text-lg leading-relaxed">
           Connect your CAT joystick controllers. You will be placed in a virtual trenching scenario with 3 active ground workers. You must maintain a 2-meter clearance at all times to pass this module.
         </p>
         <button className="bg-cat-yellow text-black font-extrabold px-10 py-4 rounded-xl hover:bg-yellow-400 transition-colors relative z-10 text-lg shadow-[0_0_20px_rgba(255,184,28,0.4)]">
           Launch Simulator Engine
         </button>
      </div>
    )
  },
  {
    id: 2,
    title: "Night Operations",
    type: "Video",
    icon: PlayCircle,
    progress: 100,
    status: "Completed",
    description: "Learn visibility constraints and lighting protocols for night shifts.",
    color: "text-green-500",
    material: (
      <div className="flex flex-col gap-6 mt-4">
        <div className="bg-black aspect-video rounded-2xl border border-white/10 flex items-center justify-center cursor-pointer group hover:border-green-500/50 transition-colors shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gray-800 opacity-50"></div>
          <PlayCircle className="w-24 h-24 text-green-500 group-hover:scale-110 transition-transform relative z-10 shadow-2xl" />
          <div className="absolute bottom-4 left-4 text-white font-bold tracking-wider relative z-10">04:12 / 15:30</div>
        </div>
        <div className="bg-white/5 p-8 rounded-2xl border border-white/10">
          <h4 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><CheckCircle className="text-green-500 w-5 h-5"/> Key Takeaways</h4>
          <ul className="list-disc list-inside text-gray-300 space-y-3 text-lg ml-2">
            <li>Always perform a 360-degree light check before moving.</li>
            <li>Rely on the cabin radar for blind spots beyond 5 meters.</li>
            <li>Reduce swing speed by 20% compared to daytime operations.</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 3,
    title: "Cold Start Procedures",
    type: "Interactive",
    icon: BookOpen,
    progress: 0,
    status: "Start Module",
    description: "Step-by-step guide to hydraulic warming without stressing the engine.",
    color: "text-blue-400",
    material: (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mt-4 shadow-xl">
        <h4 className="text-2xl font-bold text-white mb-6">Interactive Procedure Checklist</h4>
        <div className="space-y-4">
          {[
            "Turn ignition to ACC, wait 10 seconds for glow plugs to warm.",
            "Start engine, let idle at 800 RPM for exactly 3 minutes.",
            "Cycle boom slowly up and down 4 times.",
            "Cycle bucket curl 4 times to warm hydraulic fluid to operating temp."
          ].map((step, i) => (
            <label key={i} className="flex items-center gap-5 p-5 bg-black/40 rounded-xl cursor-pointer hover:bg-black/60 border border-transparent hover:border-blue-400/30 transition-colors">
              <input type="checkbox" className="w-6 h-6 accent-blue-500 cursor-pointer" />
              <span className="text-gray-200 text-lg">{step}</span>
            </label>
          ))}
        </div>
        <button className="mt-8 w-full bg-blue-500 text-white font-bold py-4 rounded-xl hover:bg-blue-400 transition-colors text-lg shadow-[0_0_15px_rgba(59,130,246,0.4)]">
          Submit Cold Start Log
        </button>
      </div>
    )
  },
  {
    id: 4,
    title: "Trench Collapse Hazards",
    type: "Quiz",
    icon: Lock,
    progress: 0,
    status: "Locked",
    description: "Complete Proximity Safety to unlock this assessment.",
    color: "text-gray-600",
    material: (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-16 flex flex-col items-center justify-center text-center mt-4 shadow-xl">
        <Lock className="w-20 h-20 text-gray-600 mb-6" />
        <h4 className="text-2xl font-bold text-gray-400 mb-3">Assessment Locked</h4>
        <p className="text-gray-500 text-lg max-w-md">You must complete the <strong>Proximity Safety</strong> simulation with a passing grade before you can take this quiz.</p>
      </div>
    )
  }
];

export default function Training() {
  const [activeId, setActiveId] = useState(null);
  const activeModule = modules.find(m => m.id === activeId);

  if (activeModule) {
    return (
      <div className="p-10 h-full flex flex-col overflow-y-auto">
        <button 
          onClick={() => setActiveId(null)} 
          className="flex items-center gap-2 text-gray-400 hover:text-white w-fit mb-8 transition-colors font-medium bg-white/5 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10"
        >
          <ArrowLeft size={18} /> Back to Learning Center
        </button>
        
        <div className="bg-gradient-to-r from-[#1a1a1a] to-[#111] border border-white/10 rounded-3xl p-8 mb-6 flex items-start justify-between shadow-2xl relative overflow-hidden">
           <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
           <div className="relative z-10">
             <div className="flex items-center gap-4 mb-3">
               <activeModule.icon className={"w-10 h-10 " + activeModule.color} />
               <h2 className="text-4xl font-light tracking-tight text-white">{activeModule.title}</h2>
             </div>
             <p className="text-gray-400 text-lg ml-14">{activeModule.description}</p>
           </div>
           <div className="text-right relative z-10 flex flex-col items-end">
             <span className="text-xs font-bold uppercase tracking-wider text-gray-400 bg-black/50 px-4 py-1.5 rounded-full border border-white/10 shadow-inner">
               {activeModule.type}
             </span>
             <div className={"mt-4 text-lg font-bold tracking-wide " + (activeModule.status === 'Locked' ? 'text-gray-500' : activeModule.status === 'Completed' ? 'text-green-500' : 'text-cat-yellow')}>
               {activeModule.status}
             </div>
           </div>
        </div>
        
        <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
           {activeModule.material}
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 h-full flex flex-col overflow-y-auto">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <p className="text-cat-yellow font-semibold tracking-wider text-sm uppercase mb-1 flex items-center gap-2">
            <BookOpen size={16} /> Learning Center
          </p>
          <h1 className="text-4xl font-light tracking-tight text-white">Training Hub</h1>
        </div>
        <div className="bg-white/5 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl flex items-center gap-3 shadow-lg">
          <Award className="text-cat-yellow w-6 h-6" />
          <div>
            <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Certification</div>
            <div className="font-medium text-gray-200">Level 3 Operator</div>
          </div>
        </div>
      </header>

      {/* AI Coaching Box */}
      <div className="bg-gradient-to-r from-[#1a1a1a] to-[#111] border border-white/10 rounded-3xl p-8 shadow-2xl mb-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cat-yellow/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="flex gap-6 items-start relative z-10">
          <div className="bg-cat-yellow/20 p-4 rounded-2xl border border-cat-yellow/30 shadow-[0_0_15px_rgba(255,184,28,0.2)]">
            <Sparkles className="text-cat-yellow w-8 h-8" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-white mb-2">Post-Shift AI Coaching</h3>
            <p className="text-gray-300 text-lg leading-relaxed italic mb-4">
              "Good shift today on EXC001. Your fuel efficiency score was 91, which is top 15% for this site. However, I noticed your idle time crept up to 58 minutes. For tomorrow, try cutting the engine if waiting on loaders for more than 5 minutes."
            </p>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                <TrendingUp size={16} className="text-green-500"/> <span className="text-sm font-medium">Efficiency +12%</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                <MessageSquare size={16} className="text-cat-yellow"/> <span className="text-sm font-medium">Ask AI a Question</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modules Grid */}
      <h2 className="text-2xl font-semibold text-white mb-6">Required Modules</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-10">
        {modules.map(mod => (
          <div 
            key={mod.id} 
            onClick={() => setActiveId(mod.id)}
            className={"bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col transition-all duration-300 shadow-xl " + (mod.status === 'Locked' ? 'opacity-60 grayscale cursor-not-allowed' : 'hover:-translate-y-1 hover:border-cat-yellow/30 cursor-pointer')}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 shadow-inner">
                <mod.icon className={"w-6 h-6 " + mod.color} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-black/30 px-2 py-1 rounded-full border border-white/5">{mod.type}</span>
            </div>
            
            <h3 className="text-xl font-medium text-white mb-2">{mod.title}</h3>
            <p className="text-sm text-gray-400 mb-6 flex-1">{mod.description}</p>
            
            <div className="mt-auto">
              <div className="flex justify-between text-sm mb-2">
                <span className={"font-bold tracking-wide " + (mod.status === 'Locked' ? 'text-gray-500' : mod.status === 'Completed' ? 'text-green-500' : 'text-cat-yellow')}>
                  {mod.status}
                </span>
                <span className="text-gray-400 font-medium">{mod.progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className={"h-full shadow-[0_0_10px_currentColor] " + (mod.status === 'Completed' ? 'bg-green-500' : 'bg-cat-yellow')}
                  style={{ width: mod.progress + '%' }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
