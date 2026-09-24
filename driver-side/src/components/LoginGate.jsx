import React, { useState } from 'react';
import { HardHat, UserCog } from 'lucide-react';
import DriverFaceAuth from './DriverFaceAuth';
import SupervisorLogin from './SupervisorLogin';

const ROLES = [
  { id: 'operator', label: 'Operator', hint: 'Face scan', icon: HardHat },
  { id: 'supervisor', label: 'Supervisor', hint: 'Username & password', icon: UserCog },
];

// The login page: pick how you're signing in. Operators verify by face, supervisors with a password.
export default function LoginGate({ onOperator, onSupervisor }) {
  const [role, setRole] = useState('operator');

  return (
    <div className="h-screen overflow-hidden bg-[#f5f5f2] flex flex-col">
      <div className="flex flex-col items-center gap-2 pt-2 pb-0 flex-shrink-0">
        <div role="tablist" aria-label="Sign in as" className="flex gap-1 p-1 rounded-xl bg-[#ffffff] border border-[#e6e6e1]">
          {ROLES.map(({ id, label, hint, icon: Icon }) => (
            <button key={id} type="button" role="tab" aria-selected={role === id} onClick={() => setRole(id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition ${
                role === id ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900'
              }`}>
              <Icon size={16} />
              <span className="leading-tight">
                <span className="block text-sm font-semibold">{label}</span>
                <span className={`block text-[10px] ${role === id ? 'text-white/70' : 'text-neutral-400'}`}>{hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {role === 'operator' ? <DriverFaceAuth onAuthenticated={onOperator} /> : <SupervisorLogin onLoggedIn={onSupervisor} />}
    </div>
  );
}
