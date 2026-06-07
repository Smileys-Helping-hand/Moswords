/**
 * Premium theme definitions for Moswords
 * Each theme includes color palette, animations, and custom styling
 */

export interface Theme {
  key: string;
  label: string;
  description: string;
  preview: string;
  textColor: string;
  dot1: string;
  dot2: string;
  icon?: any;
  animated?: boolean;
  animStyle?: Record<string, any>;
  colors?: {
    bg: string;
    bgSecondary: string;
    fg: string;
    accent: string;
    accentSecondary: string;
    danger: string;
    success: string;
    border: string;
    card: string;
  };
}

export const THEMES: Theme[] = [
  {
    key: 'default',
    label: 'Deep Space',
    description: 'Telegram-inspired dark',
    preview: 'bg-[#17212B]',
    textColor: 'text-[#2AABEE]',
    dot1: 'bg-[#2B5278]',
    dot2: 'bg-[#182533]',
    colors: {
      bg: '#17212B',
      bgSecondary: '#0F1419',
      fg: '#e9edf2',
      accent: '#2AABEE',
      accentSecondary: '#8B5CF6',
      danger: '#ef4444',
      success: '#10b981',
      border: '#1f2937',
      card: '#111827',
    },
  },
  {
    key: 'light',
    label: 'Light Mode',
    description: 'Clean & bright',
    preview: 'bg-[#f8f9fb]',
    textColor: 'text-[#a259ff]',
    dot1: 'bg-[#0EA5E9]',
    dot2: 'bg-[#e5e7eb]',
    colors: {
      bg: '#f8f9fb',
      bgSecondary: '#fff',
      fg: '#18132a',
      accent: '#a259ff',
      accentSecondary: '#00f0ff',
      danger: '#e53935',
      success: '#43a047',
      border: '#e0e0e0',
      card: '#fff',
    },
  },
  {
    key: 'cyberpunk',
    label: 'Cyberpunk',
    description: 'GitHub dark vibes',
    preview: 'bg-[#0D1117]',
    textColor: 'text-[#00d4ff]',
    dot1: 'bg-[#00d4ff]',
    dot2: 'bg-[#7c3aed]',
    colors: {
      bg: '#0D1117',
      bgSecondary: '#161b22',
      fg: '#e6edf3',
      accent: '#00d4ff',
      accentSecondary: '#7c3aed',
      danger: '#f85149',
      success: '#3fb950',
      border: '#30363d',
      card: '#161b22',
    },
  },
  {
    key: 'nord',
    label: 'Nord',
    description: 'Arctic blue calm',
    preview: 'bg-[#2e3440]',
    textColor: 'text-[#88c0d0]',
    dot1: 'bg-[#88c0d0]',
    dot2: 'bg-[#b48ead]',
    colors: {
      bg: '#2e3440',
      bgSecondary: '#3b4252',
      fg: '#eceff4',
      accent: '#88c0d0',
      accentSecondary: '#b48ead',
      danger: '#bf616a',
      success: '#a3be8c',
      border: '#4c566a',
      card: '#434c5e',
    },
  },
  {
    key: 'aurora',
    label: 'Aurora',
    description: 'Animated northern lights',
    preview: 'bg-[#0a0e1a]',
    textColor: 'text-[#7c4dff]',
    dot1: 'bg-[#7c4dff]',
    dot2: 'bg-[#00e5ff]',
    animated: true,
    animStyle: {
      background: 'conic-gradient(from 0deg at 50% 50%, #7c4dff44, #00e5ff33, #00e67622, #7c4dff44)',
      animation: 'aurora-spin 4s linear infinite',
    },
    colors: {
      bg: '#0a0e1a',
      bgSecondary: '#0f1428',
      fg: '#e8f0fe',
      accent: '#7c4dff',
      accentSecondary: '#00e5ff',
      danger: '#ff1744',
      success: '#00e676',
      border: '#1a2040',
      card: '#0f1428',
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
    animated: true,
    colors: {
      bg: '#05050f',
      bgSecondary: '#0a0a20',
      fg: '#c8d8ff',
      accent: '#6eb5ff',
      accentSecondary: '#c77dff',
      danger: '#ff4d6d',
      success: '#52b788',
      border: '#14142a',
      card: '#0a0a20',
    },
  },
  {
    key: 'sunset',
    label: 'Sunset',
    description: 'Warm glowing horizon',
    preview: 'bg-[#1a0a0f]',
    textColor: 'text-[#ff6b35]',
    dot1: 'bg-[#ff6b35]',
    dot2: 'bg-[#ff9f1c]',
    animated: true,
    animStyle: {
      background: 'linear-gradient(160deg, #ff6b3544, #ff9f1c33, #c9184a22)',
      animation: 'sunset-shift 3s ease-in-out infinite alternate',
    },
    colors: {
      bg: '#1a0a0f',
      bgSecondary: '#2a1018',
      fg: '#ffe0cc',
      accent: '#ff6b35',
      accentSecondary: '#ff9f1c',
      danger: '#c9184a',
      success: '#52b788',
      border: '#3a1820',
      card: '#2a1018',
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
    animated: true,
    animStyle: {
      boxShadow: '0 0 12px #ff00ff80, 0 0 24px #ff00ff40',
      borderColor: '#ff00ff60',
    },
    colors: {
      bg: '#000000',
      bgSecondary: '#050510',
      fg: '#ffffff',
      accent: '#ff00ff',
      accentSecondary: '#00ffff',
      danger: '#ff003c',
      success: '#00ff88',
      border: '#1a0a2e',
      card: '#050510',
    },
  },
  {
    key: 'glassmorphism',
    label: 'Glassmorphism',
    description: 'Frosted glass aesthetic',
    preview: 'bg-[#0f0f1e]',
    textColor: 'text-[#e0e7ff]',
    dot1: 'bg-[#818cf8]',
    dot2: 'bg-[#a78bfa]',
    colors: {
      bg: '#0f0f1e',
      bgSecondary: '#1a1a2e',
      fg: '#e0e7ff',
      accent: '#818cf8',
      accentSecondary: '#a78bfa',
      danger: '#f87171',
      success: '#4ade80',
      border: '#312e81',
      card: '#1a1a2e',
    },
  },
  {
    key: 'gradient',
    label: 'Gradient',
    description: 'Smooth color gradient',
    preview: 'bg-gradient-to-br from-[#667eea] to-[#764ba2]',
    textColor: 'text-[#fbbf24]',
    dot1: 'bg-[#667eea]',
    dot2: 'bg-[#764ba2]',
    colors: {
      bg: '#1a1035',
      bgSecondary: '#2d1b4e',
      fg: '#f3f4f6',
      accent: '#fbbf24',
      accentSecondary: '#667eea',
      danger: '#ef5350',
      success: '#66bb6a',
      border: '#3d2463',
      card: '#2d1b4e',
    },
  },
  {
    key: 'dracula',
    label: 'Dracula',
    description: 'Elegant dark mode',
    preview: 'bg-[#282a36]',
    textColor: 'text-[#8be9fd]',
    dot1: 'bg-[#8be9fd]',
    dot2: 'bg-[#ff79c6]',
    colors: {
      bg: '#282a36',
      bgSecondary: '#21222c',
      fg: '#f8f8f2',
      accent: '#8be9fd',
      accentSecondary: '#ff79c6',
      danger: '#ff5555',
      success: '#50fa7b',
      border: '#44475a',
      card: '#21222c',
    },
  },
  {
    key: 'monochrome',
    label: 'Monochrome',
    description: 'Minimalist grayscale',
    preview: 'bg-[#1a1a1a]',
    textColor: 'text-[#f0f0f0]',
    dot1: 'bg-[#808080]',
    dot2: 'bg-[#b0b0b0]',
    colors: {
      bg: '#1a1a1a',
      bgSecondary: '#2d2d2d',
      fg: '#f0f0f0',
      accent: '#d0d0d0',
      accentSecondary: '#808080',
      danger: '#cc0000',
      success: '#009900',
      border: '#404040',
      card: '#2d2d2d',
    },
  },
];

export const getThemeByKey = (key: string): Theme | undefined => {
  return THEMES.find((t) => t.key === key);
};

export const getAnimatedThemes = (): Theme[] => {
  return THEMES.filter((t) => t.animated);
};
