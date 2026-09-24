import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { supervisorLogin } from '../services/supervisorApi';
import CatLogo from './CatLogo';

export default function SupervisorLogin({ onLoggedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const d = await supervisorLogin(username.trim(), password);
      onLoggedIn(d.username);
    } catch (err) {
      setError(err.message);
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  const field = 'w-full bg-[#f5f5f2] border border-[#e6e6e1] focus:border-[#FFCD11] outline-none rounded-lg px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 transition';

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-[#ffffff] border border-[#e6e6e1] rounded-2xl p-6 space-y-4">
        <div>
          <CatLogo height={48} className="mb-3" />
          <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">Supervisor sign-in</h1>
          <p className="text-sm text-neutral-500 mt-1">Monitor every cab and assign tasks.</p>
        </div>

        <label className="block">
          <span className="text-xs text-neutral-600">Username</span>
          <input className={`${field} mt-1`} value={username} onChange={e => setUsername(e.target.value)}
            autoComplete="username" autoFocus required placeholder="supervisor" />
        </label>

        <label className="block">
          <span className="text-xs text-neutral-600">Password</span>
          <div className="relative mt-1">
            <input className={`${field} pr-10`} type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
              autoComplete="current-password" required placeholder="••••••••" />
            <button type="button" onClick={() => setShow(s => !s)} title={show ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-900 p-1">
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </label>

        {error && <div role="alert" className="text-sm text-red-600 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}

        <button type="submit" disabled={busy || !username || !password}
          className="w-full flex items-center justify-center gap-2 bg-neutral-900 hover:bg-black disabled:opacity-40 text-white font-semibold text-sm py-2.5 rounded-lg transition">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
