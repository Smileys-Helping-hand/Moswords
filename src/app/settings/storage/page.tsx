'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import {
  ArrowLeft,
  Database,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  HardDrive,
  Cloud,
  CloudOff,
  CheckCircle,
  Calendar,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { loadConversationListIDB, saveConversationListIDB } from '@/lib/idb-cache';

const BACKUP_PREFS_KEY = 'mw_backup_prefs';

interface BackupPrefs {
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly' | 'manual';
  includeMedia: boolean;
  lastBackup: string | null;
}

function loadPrefs(): BackupPrefs {
  if (typeof window === 'undefined') return { autoBackup: false, backupFrequency: 'weekly', includeMedia: false, lastBackup: null };
  try {
    const raw = localStorage.getItem(BACKUP_PREFS_KEY);
    if (raw) return { autoBackup: false, backupFrequency: 'weekly', includeMedia: false, lastBackup: null, ...JSON.parse(raw) };
  } catch {}
  return { autoBackup: false, backupFrequency: 'weekly', includeMedia: false, lastBackup: null };
}

function savePrefs(p: BackupPrefs) {
  try { localStorage.setItem(BACKUP_PREFS_KEY, JSON.stringify(p)); } catch {}
}

function SettingRow({
  icon: Icon,
  title,
  description,
  children,
  color = 'text-primary',
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children?: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="flex items-start gap-4 py-4">
      <div className={`mt-0.5 ${color}`}>
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

export default function StorageSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { session } = useAuth();
  const currentUserId = (session?.user as any)?.id;
  const importRef = useRef<HTMLInputElement>(null);

  const [prefs, setPrefs] = useState<BackupPrefs>(loadPrefs());
  const [cacheSize, setCacheSize] = useState<string>('Calculating...');
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);

  const updatePref = <K extends keyof BackupPrefs>(key: K, value: BackupPrefs[K]) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    savePrefs(next);
  };

  // Estimate IDB cache size using storage manager
  useEffect(() => {
    const estimate = async () => {
      try {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const { usage } = await navigator.storage.estimate();
          if (usage) {
            const mb = (usage / (1024 * 1024)).toFixed(2);
            setCacheSize(`${mb} MB used`);
          } else {
            setCacheSize('Unknown');
          }
        } else {
          setCacheSize('Unknown');
        }
      } catch {
        setCacheSize('Unknown');
      }
    };
    estimate();
  }, []);

  // Export all cached chats as JSON
  const handleExport = async () => {
    if (!currentUserId) return;
    setExporting(true);
    try {
      const conversations = await loadConversationListIDB(currentUserId);
      const backup = {
        exportedAt: new Date().toISOString(),
        version: 1,
        userId: currentUserId,
        conversations: conversations ?? [],
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `moswords-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      const now = new Date().toLocaleString();
      updatePref('lastBackup', now);
      toast({ title: 'Backup exported!', description: 'Your chats have been saved to a file.' });
    } catch {
      toast({ variant: 'destructive', title: 'Export failed', description: 'Could not export backup.' });
    } finally {
      setExporting(false);
    }
  };

  // Import chats from JSON backup
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUserId) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.conversations || !Array.isArray(data.conversations)) throw new Error('Invalid format');
      await saveConversationListIDB(currentUserId, data.conversations);
      toast({ title: 'Backup imported!', description: `Restored ${data.conversations.length} conversations.` });
    } catch {
      toast({ variant: 'destructive', title: 'Import failed', description: 'Invalid or corrupt backup file.' });
    }
    // reset input
    e.target.value = '';
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Clear all local cache
  const handleClearCache = async () => {
    setClearing(true);
    try {
      const dbs = await indexedDB.databases?.();
      if (dbs) {
        for (const db of dbs) {
          if (db.name) indexedDB.deleteDatabase(db.name);
        }
      }
      // Also clear relevant localStorage keys
      const keysToKeep = [BACKUP_PREFS_KEY, 'mw_chat_settings', 'mw_appearance', 'mw_privacy'];
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && !keysToKeep.includes(key)) {
          // Only remove cache-related keys
          if (key.startsWith('muted_convos_') || key.startsWith('mw_cache_')) {
            localStorage.removeItem(key);
          }
        }
      }
      toast({ title: 'Cache cleared', description: 'Local data removed. Pages will reload from server.' });
      setCacheSize('0 MB used');
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not clear cache.' });
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-6">
      {/* Header */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-20 glass-panel border-b border-border/40 flex items-center gap-3 px-4 py-3"
      >
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold flex-1">Storage &amp; Backup</h1>
      </motion.div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Storage info card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl border border-white/10 p-4 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <HardDrive className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Local Cache</p>
            <p className="text-xs text-muted-foreground mt-0.5">{cacheSize}</p>
            <p className="text-xs text-muted-foreground">Messages &amp; media cached on this device</p>
          </div>
        </motion.div>

        {/* Backup section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card rounded-2xl border border-white/10 px-3 divide-y divide-white/10"
        >
          <p className="px-1 pt-4 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Backup
          </p>

          <SettingRow
            icon={prefs.autoBackup ? Cloud : CloudOff}
            title="Auto Backup"
            description="Automatically back up your chat history to a local file"
            color={prefs.autoBackup ? 'text-green-400' : 'text-muted-foreground'}
          >
            <Switch
              checked={prefs.autoBackup}
              onCheckedChange={(v) => updatePref('autoBackup', v)}
            />
          </SettingRow>

          {prefs.autoBackup && (
            <SettingRow
              icon={Calendar}
              title="Backup Frequency"
              description="How often to auto-backup your chats"
            >
              <Select
                value={prefs.backupFrequency}
                onValueChange={(v) => updatePref('backupFrequency', v as BackupPrefs['backupFrequency'])}
              >
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="manual">Manual only</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
          )}

          <SettingRow
            icon={Database}
            title="Include Media"
            description="Include media URLs in backup (files remain on server)"
          >
            <Switch
              checked={prefs.includeMedia}
              onCheckedChange={(v) => updatePref('includeMedia', v)}
            />
          </SettingRow>

          {prefs.lastBackup && (
            <div className="flex items-center gap-2 py-3 px-1 text-xs text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
              Last backup: {prefs.lastBackup}
            </div>
          )}
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl border border-white/10 p-3 space-y-2"
        >
          <p className="px-1 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Actions
          </p>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12 rounded-xl border-white/10 hover:bg-white/5"
            onClick={handleExport}
            disabled={exporting}
          >
            <Download className="w-5 h-5 text-primary shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium">{exporting ? 'Exporting...' : 'Export Backup'}</p>
              <p className="text-xs text-muted-foreground">Save chats as a JSON file</p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12 rounded-xl border-white/10 hover:bg-white/5"
            onClick={() => importRef.current?.click()}
          >
            <Upload className="w-5 h-5 text-blue-400 shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium">Import Backup</p>
              <p className="text-xs text-muted-foreground">Restore chats from a backup file</p>
            </div>
          </Button>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />

          <Separator className="my-1 bg-white/10" />

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12 rounded-xl border-destructive/30 hover:bg-destructive/10 text-destructive hover:text-destructive"
            onClick={() => setShowClearConfirm(true)}
            disabled={clearing}
          >
            <Trash2 className="w-5 h-5 shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium">{clearing ? 'Clearing...' : 'Clear Local Cache'}</p>
              <p className="text-xs opacity-70">Your online data is not affected</p>
            </div>
          </Button>
        </motion.div>

        {/* Info note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-xs text-muted-foreground px-2 text-center leading-relaxed"
        >
          Backups are stored locally on your device. Your messages are always available on the web at any time — backups let you work faster with offline-ready data.
        </motion.p>
      </div>

      {/* Clear Cache confirmation */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent className="glass-card border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Clear local cache?</AlertDialogTitle>
            <AlertDialogDescription>
              All locally cached messages and media will be removed from this device. Your data online is completely safe and will reload automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleClearCache}
            >
              Clear cache
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
