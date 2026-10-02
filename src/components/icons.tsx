import type { SVGProps } from "react";

/**
 * Moswords signature brand icon:
 * A modern speech-bubble monogram 'M' with radiating acoustic waves and neon ecosystem gradients.
 */
export function MoswordsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="none"
    >
      <defs>
        <linearGradient id="moswords-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00F0FF" />
          <stop offset="50%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="moswords-glow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.1" />
        </linearGradient>
        <filter id="mw-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#00F0FF" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Subtle glowing ambient backdrop */}
      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#moswords-glow-grad)" opacity="0.35" />

      {/* Main Speech Bubble Body with tail */}
      <path
        d="M22 8C13.16 8 6 15.16 6 24c0 3.32 1.01 6.4 2.74 8.97L6.5 40.5l8.03-2.14C16.8 39.38 19.32 40 22 40c8.84 0 16-7.16 16-16S30.84 8 22 8z"
        stroke="url(#moswords-grad)"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="#030014"
        fillOpacity="0.8"
      />

      {/* Monogram 'M' with rounded curves */}
      <path
        d="M14 29V19l6.5 6.5a2.12 2.12 0 0 0 3 0L30 19v10"
        stroke="url(#moswords-grad)"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Radiating communication signal arcs at top-right */}
      <path
        d="M36 12a14 14 0 0 1 4 9"
        stroke="#8B5CF6"
        strokeWidth="2.25"
        strokeLinecap="round"
        opacity="0.95"
      />
      <path
        d="M40 8a19 19 0 0 1 5 12"
        stroke="#00F0FF"
        strokeWidth="2.25"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

/**
 * Brand Logo with Wordmark for headers, banners, and auth pages
 */
export function MoswordsBrand({
  className = '',
  iconSize = 'w-7 h-7',
  showWordmark = true,
}: {
  className?: string;
  iconSize?: string;
  showWordmark?: boolean;
}) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div className={`relative shrink-0 flex items-center justify-center ${iconSize}`}>
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-400/20 to-purple-500/20 blur-sm pointer-events-none" />
        <MoswordsIcon className="w-full h-full relative z-10 drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]" />
      </div>
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className="text-[17px] font-bold tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent">
            Moswords
          </span>
          <span className="text-[9px] uppercase tracking-widest text-cyan-400/80 font-medium">
            Second Brain
          </span>
        </div>
      )}
    </div>
  );
}

