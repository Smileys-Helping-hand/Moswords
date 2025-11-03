import { useAuthStore } from '../store/auth';
import { Avatar } from '../components/ui/Avatar';

export const Topbar: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/60 px-6">
      <div>
        <p className="text-sm text-slate-400">Connected</p>
        <p className="text-lg font-semibold text-white">Welcome back, {user?.username ?? 'Explorer'}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-white">{user?.username ?? 'Guest'}</p>
          <p className="text-xs text-slate-400">{user?.email ?? 'No email'}</p>
        </div>
        <Avatar src={user?.avatarUrl} fallback={user?.username?.[0] ?? 'U'} />
      </div>
    </header>
  );
};
