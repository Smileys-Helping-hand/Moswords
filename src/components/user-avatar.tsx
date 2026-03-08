import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserAvatarProps {
  src: string;
  fallback?: string;
  status?: 'online' | 'offline' | 'idle';
  imageHint?: string;
}

/** Deterministic gradient palette based on first char of fallback */
const GRADIENTS = [
  'from-violet-500 to-purple-700',
  'from-sky-500 to-blue-700',
  'from-emerald-500 to-teal-700',
  'from-rose-500 to-pink-700',
  'from-amber-500 to-orange-700',
  'from-cyan-500 to-indigo-700',
  'from-fuchsia-500 to-pink-700',
  'from-lime-500 to-green-700',
];

function gradientFor(text: string): string {
  const code = text.charCodeAt(0) || 0;
  return GRADIENTS[code % GRADIENTS.length];
}

export default function UserAvatar({ src, fallback = 'U', status, imageHint }: UserAvatarProps) {
  const statusColor = {
    online: 'bg-emerald-500 status-pulse',
    idle:   'bg-amber-400',
    offline: 'bg-gray-500/60',
  };

  return (
    <div className="relative inline-block">
      <Avatar className="ring-2 ring-border/40">
        <AvatarImage src={src} alt="User avatar" data-ai-hint={imageHint} />
        <AvatarFallback
          className={`bg-gradient-to-br ${gradientFor(fallback)} text-white font-semibold text-xs select-none`}
        >
          {fallback.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      {status && (
        <span
          className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full border-2 border-background ${statusColor[status]}`}
        />
      )}
    </div>
  );
}

