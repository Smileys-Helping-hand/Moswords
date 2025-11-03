import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string | null;
  bio?: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setSession: (payload: { user: User; accessToken: string }) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(persist((set) => ({
  user: null,
  accessToken: null,
  setSession: ({ user, accessToken }) => set({ user, accessToken }),
  signOut: () => set({ user: null, accessToken: null })
}), { name: 'moswords-auth' }));
