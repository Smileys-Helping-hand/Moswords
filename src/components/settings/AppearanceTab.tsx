import { useAppearance } from '@/store/appearance';
import { useState } from 'react';
import { Loader2, Sparkles, Stars, Sun, Zap } from 'lucide-react';

const themes = [
  {
    key: 'default',
    label: 'Deep Space',
    description: 'Telegram-inspired dark',
    preview: 'bg-[#17212B]',
    textColor: 'text-[#2AABEE]',
    dot1: 'bg-[#2B5278]',
    dot2: 'bg-[#182533]',
    icon: null,
  },
  {
    key: 'light',
    label: 'Light Mode',
    description: 'Clean & bright',
    preview: 'bg-[#f8f9fb]',
    textColor: 'text-[#a259ff]',
    dot1: 'bg-[#0EA5E9]',
    dot2: 'bg-[#e5e7eb]',
    icon: null,
  },
  {
    key: 'cyberpunk',
    label: 'Cyberpunk',
    description: 'GitHub dark vibes',
    preview: 'bg-[#0D1117]',
    textColor: 'text-[#00d4ff]',
    dot1: 'bg-[#00d4ff]',
    dot2: 'bg-[#7c3aed]',
    icon: null,
  },
  {
    key: 'nord',
    label: 'Nord',
    description: 'Arctic blue calm',
    preview: 'bg-[#2e3440]',
    textColor: 'text-[#88c0d0]',
    dot1: 'bg-[#88c0d0]',
    dot2: 'bg-[#b48ead]',
    icon: null,
  },
  {
    key: 'aurora',
    label: 'Aurora',
    description: 'Animated northern lights',
    preview: 'bg-[#0a0e1a]',
    textColor: 'text-[#7c4dff]',
    dot1: 'bg-[#7c4dff]',
    dot2: 'bg-[#00e5ff]',
    icon: Sparkles,
    animated: true,
    animStyle: {
      background: 'conic-gradient(from 0deg at 50% 50%, #7c4dff44, #00e5ff33, #00e67622, #7c4dff44)',
      animation: 'aurora-spin 4s linear infinite',
    },
  },
  {
    key: 'galaxy',
    label: 'Galaxy',
    description: 'Deep space stars',
    preview: 'bg-[#05050f]',
    textColor: 'text-[#6eb5ff]',
    dot1: 'bg-[#6eb5ff]',
    dot2: 'bg-[#c77dff]',
    icon: Stars,
    animated: true,
  },
  {
    key: 'sunset',
    label: 'Sunset',
    description: 'Warm glowing horizon',
    preview: 'bg-[#1a0a0f]',
    textColor: 'text-[#ff6b35]',
    dot1: 'bg-[#ff6b35]',
    dot2: 'bg-[#ff9f1c]',
    icon: Sun,
    animated: true,
    animStyle: {
      background: 'linear-gradient(160deg, #ff6b3544, #ff9f1c33, #c9184a22)',
      animation: 'sunset-shift 3s ease-in-out infinite alternate',
    },
  },
  {
    key: 'neon',
    label: 'Neon',
    description: 'Electric glow grid',
    preview: 'bg-black',
    textColor: 'text-[#ff00ff]',
    dot1: 'bg-[#ff00ff]',
    dot2: 'bg-[#00ffff]',
    icon: Zap,
    animated: true,
    animStyle: {
      boxShadow: '0 0 12px #ff00ff80, 0 0 24px #ff00ff40',
      borderColor: '#ff00ff60',
    },
  },
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
        <h3 className="font-bold mb-1 text-lg">Theme</h3>
        <p className="text-xs text-muted-foreground mb-4">✨ Animated themes bring your chat to life</p>
        <div className="grid grid-cols-2 gap-3">
          {themes.map((t) => {
            const Icon = t.icon;
            const isActive = theme === t.key;
            return (
              <button
                key={t.key}
                className={`relative p-3 rounded-xl border-2 transition-all text-left overflow-hidden ${
                  isActive
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                    : 'border-white/15 hover:border-white/35 hover:bg-white/5'
                }`}
                onClick={() => handleThemeChange(t.key as any)}
                disabled={saving}
              >
                {/* Background preview */}
                <div
                  className={`absolute inset-0 ${t.preview} opacity-60`}
                  style={t.animated && t.animStyle ? undefined : undefined}
                />
                {t.animated && t.animStyle && (
                  <div className="absolute inset-0" style={t.animStyle as React.CSSProperties} />
                )}

                {/* Content */}
                <div className="relative z-10">
                  <div className="flex items-center gap-1.5 mb-2">
                    {Icon && <Icon className={`w-3.5 h-3.5 ${t.textColor}`} />}
                    <span className={`text-xs font-bold ${t.textColor}`}>{t.label}</span>
                    {t.animated && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-white/10 text-white/60 ml-auto">LIVE</span>
                    )}
                  </div>
                  {/* Mini chat bubble preview */}
                  <div className="flex flex-col gap-1">
                    <div className={`self-end h-2 w-12 rounded-full ${t.dot1} opacity-80`} />
                    <div className={`self-start h-2 w-8 rounded-full ${t.dot2} opacity-70`} />
                  </div>
                  <p className="text-[10px] text-white/40 mt-1.5">{t.description}</p>
                </div>

                {isActive && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
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
