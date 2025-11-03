import * as RadixAvatar from '@radix-ui/react-avatar';

interface AvatarProps {
  src?: string | null;
  fallback: string;
}

export const Avatar: React.FC<AvatarProps> = ({ src, fallback }) => (
  <RadixAvatar.Root className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-sm font-medium text-white">
    {src ? (
      <RadixAvatar.Image src={src} alt={fallback} className="h-full w-full rounded-full object-cover" />
    ) : (
      <RadixAvatar.Fallback delayMs={0}>{fallback}</RadixAvatar.Fallback>
    )}
  </RadixAvatar.Root>
);
