import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useRealtime } from '../../hooks/useRealtime';

export const VoicePanel: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const socket = useRealtime();

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data } = await api.get('/rtc/token');
        setToken(data.token);
      } catch (error) {
        setToken(null);
      }
    };
    fetchToken();
  }, []);

  useEffect(() => {
    if (!socket || !token) return;
    socket.emit('rtc:join', { token });
  }, [socket, token]);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <h3 className="text-sm font-semibold text-white">Voice & Video</h3>
      <p className="mt-2 text-sm text-slate-400">WebRTC signaling ready. Integrate media streams for live collaboration.</p>
      <p className="mt-2 text-xs text-slate-500">Current token: {token ?? 'loading…'}</p>
    </div>
  );
};
