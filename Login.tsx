import React, { useState } from 'react';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid email or password.');
        return;
      }

      // Save token
      localStorage.setItem('git_token', data.token);

      // Map backend role: backend uses 'user', frontend uses 'contributor'
      const role = data.user.role === 'admin' ? 'admin' : 'contributor';

      onLogin({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: role,
      });

    } catch (err) {
      setError('Cannot connect to server. Make sure backend is running on port 5000.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-slate-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-10 border border-white/50 backdrop-blur-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-[2rem] shadow-xl shadow-indigo-100 mb-6 transform hover:rotate-12 transition-transform duration-300">
            <i className="fa-brands fa-git-alt text-4xl text-white"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">GitMetrics</h2>
          <p className="text-slate-500 mt-2 font-medium">Authentication Portal</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
            <i className="fas fa-circle-exclamation text-red-500 mt-0.5"></i>
            <div>
              <p className="text-red-800 text-sm font-bold">Access Denied</p>
              <p className="text-red-600 text-xs mt-0.5 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
            <div className="relative group">
              <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors"></i>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-700 placeholder:text-slate-300"
                placeholder="e.g., admin@test.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Secure Password</label>
            <div className="relative group">
              <i className="fas fa-shield-halved absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors"></i>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-700 placeholder:text-slate-300"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-200 hover:bg-black hover:shadow-2xl hover:-translate-y-0.5 focus:ring-4 focus:ring-slate-200 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:translate-y-0"
          >
            {isLoading ? (
              <>
                <i className="fas fa-circle-notch fa-spin"></i>
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>Enter Dashboard</span>
                <i className="fas fa-arrow-right-long text-xs"></i>
              </>
            )}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-slate-50">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Admin Access</p>
              <p className="text-[10px] font-bold text-indigo-700">admin@test.com</p>
              <p className="text-[10px] font-bold text-indigo-700">admin123</p>
            </div>
            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
              <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Contributor</p>
              <p className="text-[10px] font-bold text-emerald-700">rahul@test.com</p>
              <p className="text-[10px] font-bold text-emerald-700">user123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
