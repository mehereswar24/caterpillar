import React from 'react';
import { Info } from 'lucide-react';

export default function TaskCard({ title, eta, shap, status, progress }) {
  const isProgress = status === 'In Progress';
  return (
    <div className={"relative overflow-hidden p-6 rounded-3xl border transition-all duration-300 hover:-translate-y-1 shadow-xl group " + (isProgress ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-cat-yellow/30' : 'bg-white/5 border-white/10')}>
      {isProgress && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gray-800">
          <div className="h-full bg-cat-yellow shadow-[0_0_10px_#FFB81C]" style={{width: progress + '%'}}></div>
        </div>
      )}
      
      <div className="flex justify-between items-start mb-6 mt-2">
        <h3 className="text-xl font-medium text-gray-100">{title}</h3>
        <span className={"px-3 py-1 text-xs font-bold tracking-wider uppercase rounded-full border " + (isProgress ? 'bg-cat-yellow/10 text-cat-yellow border-cat-yellow/20' : 'bg-white/5 text-gray-400 border-white/10')}>
          {status}
        </span>
      </div>
      
      <div className="flex items-end gap-2 mb-4">
        <div className="text-5xl font-light text-white tracking-tight">{eta}</div>
        <div className="text-gray-400 pb-1 font-medium text-lg">min</div>
      </div>
      
      <div className="flex gap-2 items-start mt-4 pt-4 border-t border-white/10">
        <Info className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
        <p className="text-sm text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">{shap}</p>
      </div>
    </div>
  );
}
