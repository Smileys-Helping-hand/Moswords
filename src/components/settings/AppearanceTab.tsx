import { useAppearance } from '@/store/appearance';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

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
  const { theme, setTheme, accent, setAccent, density, setDensity, saveToDatabase } = useAppearance();
  const [customAccent, setCustomAccent] = useState(accent);
  const [saving, setSaving] = useState(false);

  const handleThemeChange = async (newTheme: any) => {
    setTheme(newTheme);
    setSaving(true);
    await saveToDatabase();
    setSaving(false);
  };

  const handleAccentChange = (newAccent: string) => {
    setAccent(newAccent);
    setCustomAccent(newAccent);
  };

  const handleAccentSave = async () => {
    setSaving(true);
    await saveToDatabase();
    setSaving(false);
  };

  const handleDensityChange = async (newDensity: 'comfy' | 'compact') => {
    setDensity(newDensity);
    setSaving(true);
    await saveToDatabase();
    setSaving(false);
  };

  return (
    <div className="space-y-8">
      {/* Theme Switcher */}
      <section>
        <h3 className="font-bold mb-4 text-lg">Theme</h3>
        <div className="grid grid-cols-2 gap-3">
          {themes.map((t) => (
            <button
              key={t.key}
              className={`p-4 rounded-lg border-2 transition-all ${
                theme === t.key
                  ? 'border-accent bg-white/10'
                  : 'border-white/20 hover:border-white/40'
              }`}
              onClick={() => handleThemeChange(t.key as any)}
              disabled={saving}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {/* Accent Color Picker */}
      <section>
        <h3 className="font-bold mb-4 text-lg">Accent Color</h3>
        <div className="flex gap-2 mb-4 flex-wrap">
          {accentPalette.map((color) => (
            <button
              key={color}
              className="w-10 h-10 rounded-full border-2 transition-all hover:scale-110"
              style={{
                background: color,
                borderColor: accent === color ? 'white' : 'transparent',
              }}
              onClick={() => handleAccentChange(color)}
              disabled={saving}
              title={color}
            />
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={customAccent}
            onChange={(e) => setCustomAccent(e.target.value)}
            className="w-16 h-10 border rounded cursor-pointer"
          />
          <input
            type="text"
            value={customAccent}
            onChange={(e) => setCustomAccent(e.target.value)}
            placeholder="#a259ff"
            className="flex-1 p-2 border rounded bg-white/5 text-white"
          />
          <button
            onClick={handleAccentSave}
            disabled={saving || customAccent === accent}
            className="px-4 py-2 bg-accent text-white rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
          </button>
        </div>
      </section>

      {/* Interface Density */}
      <section>
        <h3 className="font-bold mb-4 text-lg">Layout Density</h3>
        <div className="flex gap-4">
          <button
            className={`px-6 py-2 rounded transition-all ${
              density === 'comfy'
                ? 'bg-accent text-white'
                : 'bg-white/10 border border-white/20 hover:bg-white/20'
            }`}
            onClick={() => handleDensityChange('comfy')}
            disabled={saving}
          >
            Comfy
          </button>
          <button
            className={`px-6 py-2 rounded transition-all ${
              density === 'compact'
                ? 'bg-accent text-white'
                : 'bg-white/10 border border-white/20 hover:bg-white/20'
            }`}
            onClick={() => handleDensityChange('compact')}
            disabled={saving}
          >
            Compact
          </button>
        </div>
      </section>

      {saving && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Saving preferences...
        </div>
      )}
    </div>
  );
}
