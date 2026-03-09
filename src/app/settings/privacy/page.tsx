'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Clock,
  Image as ImageIcon,
  Info,
  Link,
  Camera,
  CheckCheck,
  Timer,
  Users,
  ChevronRight,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

type Visibility = 'everyone' | 'contacts' | 'nobody';

interface PrivacySettings {
  readReceipts: boolean;
  lastSeenVisibility: Visibility;
  profilePictureVisibility: Visibility;
  aboutVisibility: Visibility;
  statusVisibility: Visibility;
}

const DEFAULT: PrivacySettings = {
  readReceipts: true,
  lastSeenVisibility: 'everyone',
  profilePictureVisibility: 'everyone',
  aboutVisibility: 'contacts',
  statusVisibility: 'contacts',
};

function VisibilitySelect({
  value,
  onChange,
}: {
  value: Visibility;
  onChange: (v: Visibility) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Visibility)}>
      <SelectTrigger className="w-36 glass-card border-white/20 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="glass-card border-white/20">
        <SelectItem value="everyone">Everyone</SelectItem>
        <SelectItem value="contacts">My contacts</SelectItem>
        <SelectItem value="nobody">Nobody</SelectItem>
      </SelectContent>
    </Select>
  );
}

function SettingRow({
  icon: Icon,
  iconColor = 'text-primary',
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  iconColor?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 py-4">
      <div className={`mt-0.5 ${iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{title}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export default function PrivacySettingsPage() {
  const { status } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [settings, setSettings] = useState<PrivacySettings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (status !== 'authenticated') return;
    fetch('/api/privacy')
      .then((r) => r.json())
      .then((d) => setSettings({ ...DEFAULT, ...d.privacySettings }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status]);

  const save = async (patch: Partial<PrivacySettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    setSaving(true);
    try {
      await fetch('/api/privacy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privacySettings: next }),
      });
      toast({ title: 'Privacy settings saved' });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-20 glass-panel border-b border-border/40 flex items-center gap-3 px-4 py-3"
      >
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold flex-1">Privacy</h1>
        {saving && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
      </motion.div>

      {loading ? (
        <div className="p-6 space-y-6 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-5 h-5 rounded bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 bg-muted rounded w-40" />
                <div className="h-3 bg-muted rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="max-w-lg mx-auto p-4 space-y-1">
          {/* Who can see my info */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-4 pb-2">
            Who can see my personal info
          </p>

          <div className="glass-card rounded-2xl border border-white/10 px-4 divide-y divide-white/10">
            <SettingRow icon={Clock} title="Last seen and online">
              <VisibilitySelect
                value={settings.lastSeenVisibility}
                onChange={(v) => save({ lastSeenVisibility: v })}
              />
            </SettingRow>
            <SettingRow icon={ImageIcon} title="Profile picture">
              <VisibilitySelect
                value={settings.profilePictureVisibility}
                onChange={(v) => save({ profilePictureVisibility: v })}
              />
            </SettingRow>
            <SettingRow icon={Info} title="About">
              <VisibilitySelect
                value={settings.aboutVisibility}
                onChange={(v) => save({ aboutVisibility: v })}
              />
            </SettingRow>
            <SettingRow icon={Camera} title="Status">
              <VisibilitySelect
                value={settings.statusVisibility}
                onChange={(v) => save({ statusVisibility: v })}
              />
            </SettingRow>
          </div>

          {/* Read receipts */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-6 pb-2">
            Messages
          </p>

          <div className="glass-card rounded-2xl border border-white/10 px-4">
            <SettingRow
              icon={CheckCheck}
              title="Read receipts"
              description="If turned off, you won't send or receive Read receipts. Read receipts are always sent for group chats."
            >
              <Switch
                checked={settings.readReceipts}
                onCheckedChange={(v) => save({ readReceipts: v })}
              />
            </SettingRow>
          </div>

          {/* Disappearing messages */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-6 pb-2">
            Disappearing messages
          </p>

          <div className="glass-card rounded-2xl border border-white/10 px-4">
            <button
              className="w-full flex items-center gap-4 py-4"
              onClick={() => toast({ title: 'Coming soon', description: 'Disappearing messages will be available soon' })}
            >
              <Timer className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0 text-left">
                <p className="font-medium text-sm">Default message timer</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Start new chats with disappearing messages set to your timer
                </p>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-sm">Off</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          </div>

          {/* Groups */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-6 pb-2">
            Groups
          </p>

          <div className="glass-card rounded-2xl border border-white/10 px-4">
            <SettingRow
              icon={Users}
              title="Who can add me to groups"
              description="My contacts can add you to groups"
            >
              <div className="text-sm text-muted-foreground">Contacts</div>
            </SettingRow>
          </div>
        </div>
      )}
    </div>
  );
}
