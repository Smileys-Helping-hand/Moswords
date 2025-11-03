import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { NavLink } from 'react-router-dom';

interface Server {
  _id: string;
  name: string;
  icon?: string;
}

export const ServerList: React.FC = () => {
  const [servers, setServers] = useState<Server[]>([]);

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const { data } = await api.get('/plugins');
        setServers(data.plugins.map((plugin: any, index: number) => ({
          _id: `server-${index}`,
          name: plugin.name,
          icon: undefined
        })));
      } catch (error) {
        console.error(error);
      }
    };
    fetchServers();
  }, []);

  return (
    <div className="px-4">
      <h3 className="text-xs uppercase tracking-wide text-slate-500">Servers</h3>
      <div className="mt-2 space-y-1">
        {servers.map((server) => (
          <NavLink key={server._id} to={`/chat/${server._id}/general`} className={({ isActive }) => `block rounded px-3 py-2 text-sm transition ${isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/60'}`}>
            {server.name}
          </NavLink>
        ))}
      </div>
    </div>
  );
};
