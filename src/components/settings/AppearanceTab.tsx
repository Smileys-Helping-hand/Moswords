import { useAppearance } from '@/store/appearance';
import { useState } from 'react';

const themes = [
  { key: 'default', label: 'Deep Space' },
  { key: 'light', label: 'Light Mode' },
  { key: 'cyberpunk', label: 'Cyberpunk' },
  { key: 'nord', label: 'Nord' },
];

const accentPalette = [
  '#00f0ff', '#a259ff', '#00e676', '#ff9800',
  '#ff3b3b', '#ff69b4', '#ffd600', '#fff',
];

export default function AppearanceTab() {
  const { theme, setTheme, accent, setAccent, density, setDensity } = useAppearance();
  const [customAccent, setCustomAccent] = useState(accent);

  return (
    <div className="space-y-8">
      {/* Theme Switcher */}
      <section>
        <h3 className="font-bold mb-2">Theme</h3>
        <div className="flex gap-4">
          {themes.map((t) => (
            <button
              key={t.key}
              className={`p-4 rounded-lg border-2 ${theme === t.key ? 'border-accent' : 'border-transparent'} bg-[var(--color-card)]`}
              onClick={() => setTheme(t.key as any)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {/* Accent Color Picker */}
      <section>
        <h3 className="font-bold mb-2">Accent Color</h3>
        <div className="flex gap-2 mb-2">
          {accentPalette.map((color) => (
            <button
              key={color}
              className="w-8 h-8 rounded-full border-2"
              style={{ background: color, borderColor: accent === color ? 'var(--color-accent)' : 'transparent' }}
              onClick={() => { setAccent(color); setCustomAccent(color); }}
            />
          ))}
        </div>
        <input
          type="color"
          value={customAccent}
          onChange={e => { setCustomAccent(e.target.value); setAccent(e.target.value); }}
          className="w-10 h-10 border rounded"
        />
        <input
          type="text"
          value={customAccent}
          onChange={e => { setCustomAccent(e.target.value); setAccent(e.target.value); }}
          className="ml-2 p-1 border rounded w-24"
          placeholder="#a259ff"
        />
      </section>

      {/* Interface Density */}
      <section>
        <h3 className="font-bold mb-2">Layout Density</h3>
        <div className="flex gap-4">
          <button
            className={`px-4 py-2 rounded ${density === 'comfy' ? 'bg-accent text-white' : 'bg-card'}`}
            onClick={() => setDensity('comfy')}
          >Comfy</button>
          <button
            className={`px-4 py-2 rounded ${density === 'compact' ? 'bg-accent text-white' : 'bg-card'}`}
            onClick={() => setDensity('compact')}
          >Compact</button>
        </div>
      </section>
    </div>
  );
}
