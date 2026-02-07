import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'default' | 'light' | 'cyberpunk' | 'nord';

interface AppearanceState {
  theme: Theme;
  accent: string; // hex
  density: 'comfy' | 'compact';
  setTheme: (theme: Theme) => void;
  setAccent: (accent: string) => void;
  setDensity: (density: 'comfy' | 'compact') => void;
  loadFromDatabase: (preferences: any) => void;
  saveToDatabase: () => Promise<void>;
}

export const useAppearance = create<AppearanceState>()(
  persist(
    (set, get) => ({
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
      
      loadFromDatabase: (preferences) => {
        if (preferences) {
          const { theme, accent, density } = preferences;
          if (theme) get().setTheme(theme);
          if (accent) get().setAccent(accent);
          if (density) set({ density });
        }
      },
      
      saveToDatabase: async () => {
        try {
          const state = get();
          await fetch('/api/profile/preferences', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              appearance: {
                theme: state.theme,
                accent: state.accent,
                density: state.density,
              },
            }),
          });
        } catch (error) {
          console.error('Failed to save appearance preferences:', error);
        }
      },
    }),
    {
      name: 'appearance-storage',
      partialize: (state) => ({
        theme: state.theme,
        accent: state.accent,
        density: state.density,
      }),
    }
  )
);
