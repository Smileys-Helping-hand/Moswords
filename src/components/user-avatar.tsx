import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserAvatarProps {
  src: string;
  fallback?: string;
  status?: 'online' | 'offline' | 'idle';
  imageHint?: string;
}

export default function UserAvatar({ src, fallback = 'U', status, imageHint }: UserAvatarProps) {
  const statusColor = {
    online: 'bg-green-500',
    idle: 'bg-yellow-500',
    offline: 'bg-gray-500',
  };

  return (
    <div className="relative">
      <Avatar>
        <AvatarImage src={src} alt="User avatar" data-ai-hint={imageHint} />
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>
      {status && (
        <span className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full border-2 border-background ${statusColor[status]}`} />
      )}
    </div>
  );
}
