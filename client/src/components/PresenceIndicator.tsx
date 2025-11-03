const STATUS_COLORS: Record<string, string> = {
  online: 'bg-emerald-500',
  idle: 'bg-amber-500',
  offline: 'bg-slate-600'
};

interface PresenceIndicatorProps {
  status: 'online' | 'idle' | 'offline';
  label: string;
}

export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({ status, label }) => (
  <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
    <span className={`h-3 w-3 rounded-full ${STATUS_COLORS[status]}`}></span>
    <span className="text-sm text-slate-300">{label}</span>
  </div>
);
