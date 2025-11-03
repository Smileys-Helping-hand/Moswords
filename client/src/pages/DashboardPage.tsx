import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { PresenceIndicator } from '../components/PresenceIndicator';
import { FileDashboard } from '../features/files/FileDashboard';
import { VoicePanel } from '../features/rtc/VoicePanel';

interface Metric {
  label: string;
  value: string;
}

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<Metric[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/notifications');
        if (data.subscribed) {
          setMetrics([
            { label: 'Servers joined', value: '3' },
            { label: 'Unread messages', value: '24' },
            { label: 'Active plugins', value: '2' }
          ]);
        }
      } catch (error) {
        console.error(error);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <section>
        <h2 className="text-xl font-semibold text-white">Overview</h2>
        <p className="text-sm text-slate-400">High-level activity across servers, channels, and plugins.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-sm text-slate-400">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{metric.value}</p>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h3 className="text-lg font-semibold text-white">Presence snapshot</h3>
        <div className="mt-3 flex gap-4">
          <PresenceIndicator status="online" label="Teammates online" />
          <PresenceIndicator status="idle" label="Idle" />
          <PresenceIndicator status="offline" label="Offline" />
        </div>
      </section>
      <VoicePanel />
      <section>
        <h3 className="text-lg font-semibold text-white">Recent uploads</h3>
        <p className="text-sm text-slate-400">Manage assets and switch between original and optimized variants.</p>
        <div className="mt-3">
          <FileDashboard />
        </div>
      </section>
    </div>
  );
};
