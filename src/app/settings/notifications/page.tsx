'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Bell, MessageSquare, Users, Phone, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PREFS_KEY = 'mw_notification_prefs';

interface NotifPrefs {
  messages: boolean;
  groups: boolean;
  calls: boolean;
  sounds: boolean;
  vibration: boolean;
  showPreview: boolean;
}

const defaults: NotifPrefs = {
  messages: true,
  groups: true,
  calls: true,
  sounds: true,
  vibration: true,
  showPreview: true,
};

function SettingRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4 py-4">
      <Icon className="w-5 h-5 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<NotifPrefs>(defaults);
  const [permission, setPermission] = useState<string>('default');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) setPrefs({ ...defaults, ...JSON.parse(raw) });
    } catch {}

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const update = (patch: Partial<NotifPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch {}
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast({ variant: 'destructive', title: 'Not supported', description: 'Notifications are not supported in this browser.' });
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      toast({ title: 'Notifications enabled', description: 'You will receive push notifications.' });
    } else {
      toast({ variant: 'destructive', title: 'Permission denied', description: 'Enable notifications in your browser settings.' });
    }
  };

  return (
    <div className="min-h-[100svh] bg-background flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-4 bg-background/90 backdrop-blur-sm border-b border-border/50"
      >
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold">Notifications</h1>
          <p className="text-xs text-muted-foreground">Manage how you receive alerts</p>
        </div>
      </motion.header>

      <div className="flex-1 overflow-y-auto p-4 max-w-2xl w-full mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>

          {/* Permission banner */}
          {permission !== 'granted' && (
            <div className="glass-card rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 flex items-start gap-3 mb-2">
              <Bell className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-yellow-300">
                  {permission === 'denied' ? 'Notifications are blocked' : 'Enable push notifications'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {permission === 'denied'
                    ? 'Go to your browser/OS settings to allow notifications for this app.'
                    : 'Allow notifications to receive alerts when you get new messages.'}
                </p>
              </div>
              {permission !== 'denied' && (
                <Button size="sm" variant="outline" className="shrink-0 border-yellow-500/40 text-yellow-300" onClick={requestPermission}>
                  Enable
                </Button>
              )}
            </div>
          )}

          {/* Notify me about */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-2">
            Notify me about
          </p>
          <div className="glass-card rounded-2xl border border-white/10 px-4 divide-y divide-white/10">
            <SettingRow
              icon={MessageSquare}
              title="Direct Messages"
              description="New messages from your contacts"
              checked={prefs.messages}
              onChange={(v) => update({ messages: v })}
            />
            <SettingRow
              icon={Users}
              title="Group Chats"
              description="Messages in groups you belong to"
              checked={prefs.groups}
              onChange={(v) => update({ groups: v })}
            />
            <SettingRow
              icon={Phone}
              title="Calls"
              description="Incoming voice and video calls"
              checked={prefs.calls}
              onChange={(v) => update({ calls: v })}
            />
          </div>

          {/* Sound & vibration */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-4 pb-2">
            Sound &amp; Vibration
          </p>
          <div className="glass-card rounded-2xl border border-white/10 px-4 divide-y divide-white/10">
            <SettingRow
              icon={Volume2}
              title="Notification sounds"
              description="Play a sound for new notifications"
              checked={prefs.sounds}
              onChange={(v) => update({ sounds: v })}
            />
            <SettingRow
              icon={Bell}
              title="Vibration"
              description="Vibrate when a notification arrives"
              checked={prefs.vibration}
              onChange={(v) => update({ vibration: v })}
            />
            <SettingRow
              icon={MessageSquare}
              title="Show preview"
              description="Display message content in notifications"
              checked={prefs.showPreview}
              onChange={(v) => update({ showPreview: v })}
            />
          </div>

        </motion.div>
      </div>
    </div>
  );
}
