import { NavLink } from 'react-router-dom';
import { ServerList } from '../features/servers/ServerList';
import { useTheme } from '../store/theme';
import { Moon, Sun } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const themeStore = useTheme();
  const theme = themeStore((state) => state.theme);
  const toggle = themeStore((state) => state.toggle);

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/60">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-lg font-semibold text-white">Moswords</span>
        <button
          onClick={toggle}
          className="rounded-full border border-slate-700 p-2 text-slate-200 transition hover:bg-slate-800"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
      <ServerList />
      <nav className="mt-4 space-y-1 px-4">
        <NavLink className={({ isActive }) => `block rounded px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/60'}`} to="/">
          Dashboard
        </NavLink>
        <NavLink className={({ isActive }) => `block rounded px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/60'}`} to="/settings">
          Settings
        </NavLink>
      </nav>
    </aside>
  );
};
