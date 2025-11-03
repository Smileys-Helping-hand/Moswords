import React, { createContext, useContext, useEffect } from 'react';
import { create } from 'zustand';

interface ThemeState {
  theme: 'light' | 'dark';
  toggle: () => void;
}

const getPreferredTheme = () => {
  if (typeof window === 'undefined') {
    return 'dark';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const useThemeStore = create<ThemeState>((set) => ({
  theme: getPreferredTheme(),
  toggle: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' }))
}));

const ThemeContext = createContext(useThemeStore);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <ThemeContext.Provider value={useThemeStore}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
