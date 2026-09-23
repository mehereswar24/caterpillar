import React from 'react';

export default function TaskCard({ title, eta, shap, status }) {
  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold">{title}</h3>
        <span className={`px-3 py-1 rounded text-sm ${status === 'In Progress' ? 'bg-cat-yellow text-black' : 'bg-gray-700'}`}>
          {status}
        </span>
      </div>
      <div className="text-4xl font-light mb-2">{eta}</div>
      <p className="text-gray-400 text-sm">{shap}</p>
    </div>
  );
}
