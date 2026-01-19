import { useContext, createContext } from 'react';
import { Session } from 'next-auth';

interface AuthContextType {
  session: Session | null;
  status: 'authenticated' | 'loading' | 'unauthenticated';
}

export const AuthContext = createContext<AuthContextType>({
  session: null,
  status: 'loading',
});

export const useAuth = () => {
  return useContext(AuthContext);
};
