import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.post('/auth/login', { email, password });
      setSession({ user: data.user, accessToken: data.accessToken });
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Unable to log in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-slate-100">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <h1 className="text-2xl font-semibold text-white">Sign in</h1>
        {error && <p className="rounded border border-red-500 bg-red-500/20 p-2 text-sm text-red-200">{error}</p>}
        <div className="space-y-2">
          <label className="text-sm text-slate-300">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 focus:border-brand-500 focus:outline-none" required />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-300">Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 focus:border-brand-500 focus:outline-none" required />
        </div>
        <button type="submit" disabled={loading} className="w-full rounded bg-brand-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-sm text-slate-400">
          No account yet? <Link to="/register" className="text-brand-500 hover:underline">Create one</Link>
        </p>
      </form>
    </div>
  );
};
