'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Palette,
  MessageSquare,
  Eye,
  Type,
  Mic,
  Archive,
  Monitor,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

type FontSize = 'small' | 'medium' | 'large';

interface ChatSettings {
  enterIsSend: boolean;
  mediaVisibility: boolean;
  fontSize: FontSize;
  keepChatsArchived: boolean;
}

const STORAGE_KEY = 'mw_chat_settings';

function loadSettings(): ChatSettings {
  if (typeof window === 'undefined') {
    return { enterIsSend: false, mediaVisibility: true, fontSize: 'medium', keepChatsArchived: false };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { enterIsSend: false, mediaVisibility: true, fontSize: 'medium', keepChatsArchived: false, ...JSON.parse(raw) };
  } catch {}
  return { enterIsSend: false, mediaVisibility: true, fontSize: 'medium', keepChatsArchived: false };
}

function saveSettings(s: ChatSettings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
  // Apply font size to root
  const root = document.documentElement;
  const sizes: Record<FontSize, string> = { small: '14px', medium: '16px', large: '18px' };
  root.style.setProperty('--chat-font-size', sizes[s.fontSize]);
}

function SettingRow({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 py-4">
      <div className="mt-0.5 text-primary">
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

export default function ChatSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [settings, setSettings] = useState<ChatSettings>(() => ({
    enterIsSend: false,
    mediaVisibility: true,
    fontSize: 'medium',
    keepChatsArchived: false,
  }));

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const update = (patch: Partial<ChatSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
    toast({ title: 'Saved', description: 'Chat settings updated' });
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
        <h1 className="text-lg font-bold flex-1">Chats</h1>
      </motion.div>

      <div className="max-w-lg mx-auto p-4 space-y-1">
        {/* Display */}
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-4 pb-2">
          Display
        </p>

        <div className="glass-card rounded-2xl border border-white/10 px-4 divide-y divide-white/10">
          <button
            className="w-full flex items-center gap-4 py-4"
            onClick={() => router.push('/profile')}
          >
            <Monitor className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 text-left">
              <p className="font-medium text-sm">Theme</p>
              <p className="text-xs text-muted-foreground">System default</p>
            </div>
          </button>
          <Separator className="hidden" />
          <button
            className="w-full flex items-center gap-4 py-4"
            onClick={() => router.push('/profile')}
          >
            <Palette className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 text-left">
              <p className="font-medium text-sm">Default chat theme</p>
            </div>
          </button>
        </div>

        {/* Chat Settings */}
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-6 pb-2">
          Chat settings
        </p>

        <div className="glass-card rounded-2xl border border-white/10 px-4 divide-y divide-white/10">
          <SettingRow
            icon={MessageSquare}
            title="Enter is send"
            description="Enter key will send your message"
          >
            <Switch
              checked={settings.enterIsSend}
              onCheckedChange={(v) => update({ enterIsSend: v })}
            />
          </SettingRow>

          <SettingRow
            icon={Eye}
            title="Media visibility"
            description="Show newly downloaded media in your device's gallery"
          >
            <Switch
              checked={settings.mediaVisibility}
              onCheckedChange={(v) => update({ mediaVisibility: v })}
            />
          </SettingRow>

          <SettingRow icon={Type} title="Font size">
            <Select
              value={settings.fontSize}
              onValueChange={(v) => update({ fontSize: v as FontSize })}
            >
              <SelectTrigger className="w-28 glass-card border-white/20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-card border-white/20">
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow
            icon={Mic}
            title="Voice message transcripts"
            description="Read new voice messages"
          >
            <Switch disabled checked={false} />
          </SettingRow>
        </div>

        {/* Archived chats */}
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-6 pb-2">
          Archived chats
        </p>

        <div className="glass-card rounded-2xl border border-white/10 px-4">
          <SettingRow
            icon={Archive}
            title="Keep chats archived"
            description="Archived chats will remain archived when you receive a new message"
          >
            <Switch
              checked={settings.keepChatsArchived}
              onCheckedChange={(v) => update({ keepChatsArchived: v })}
            />
          </SettingRow>
        </div>
      </div>
    </div>
  );
}
