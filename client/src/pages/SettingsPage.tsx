import { useState } from 'react';
import { useAuthStore } from '../store/auth';
import { api } from '../lib/api';

export const SettingsPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const [bio, setBio] = useState(user?.bio ?? '');
  const [status, setStatus] = useState('online');
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      await api.post('/presence/status', { status });
      setMessage('Settings saved');
    } catch (error) {
      setMessage('Unable to save settings');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold text-white">Profile</h2>
        <p className="text-sm text-slate-400">Update your personal details and presence.</p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm text-slate-300">Bio</label>
            <textarea value={bio} onChange={(event) => setBio(event.target.value)} className="mt-2 h-24 w-full rounded border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 focus:border-brand-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-sm text-slate-300">Status</label>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand-500 focus:outline-none">
              <option value="online">Online</option>
              <option value="idle">Idle</option>
              <option value="dnd">Do not disturb</option>
              <option value="offline">Offline</option>
            </select>
          </div>
          <button onClick={handleSave} className="rounded bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600">
            Save changes
          </button>
          {message && <p className="text-sm text-slate-400">{message}</p>}
        </div>
      </section>
    </div>
  );
};
