import { create } from 'zustand';

export type Theme = 'default' | 'light' | 'cyberpunk' | 'nord';

interface AppearanceState {
  theme: Theme;
  accent: string; // hex
  density: 'comfy' | 'compact';
  setTheme: (theme: Theme) => void;
  setAccent: (accent: string) => void;
  setDensity: (density: 'comfy' | 'compact') => void;
}

export const useAppearance = create<AppearanceState>((set) => ({
  theme: 'default',
  accent: '#a259ff',
  density: 'comfy',
  setTheme: (theme) => {
    document.body.classList.remove('theme-light', 'theme-cyberpunk', 'theme-nord');
    if (theme !== 'default') document.body.classList.add(`theme-${theme}`);
    set({ theme });
  },
  setAccent: (accent) => {
    document.documentElement.style.setProperty('--color-accent', accent);
    set({ accent });
  },
  setDensity: (density) => set({ density }),
}));
