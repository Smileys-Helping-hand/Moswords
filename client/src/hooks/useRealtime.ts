import { useEffect, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth';

export const useRealtime = () => {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const socket: Socket | null = useMemo(() => {
    if (!token || !user) return null;
    return io('/', {
      auth: { userId: user.id },
      autoConnect: false
    });
  }, [token, user]);

  useEffect(() => {
    if (!socket) return;
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  return socket;
};
