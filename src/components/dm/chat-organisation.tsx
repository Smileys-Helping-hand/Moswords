'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export type ChatType = 'dm' | 'group';

export interface ChatPref {
  chatType: ChatType;
  chatId: string;
  archived: boolean;
  pinned: boolean;
  folderId: string | null;
}

export interface ChatFolder {
  id: string;
  name: string;
  position: number;
}

export const prefKey = (type: ChatType, id: string) => `${type}:${id}`;

const EMPTY: Omit<ChatPref, 'chatType' | 'chatId'> = { archived: false, pinned: false, folderId: null };

/**
 * Per-user archive / pin / folder state for every chat, with optimistic
 * updates (the UI changes instantly; a failed save rolls back with a toast).
 */
export function useChatOrganisation(enabled: boolean) {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Map<string, ChatPref>>(new Map());
  const [folders, setFolders] = useState<ChatFolder[]>([]);

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/chats/preferences', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setFolders(data.folders ?? []);
      setPrefs(new Map((data.prefs as ChatPref[]).map((p) => [prefKey(p.chatType, p.chatId), p])));
    } catch {
      /* offline — keep what we have */
    }
  }, []);

  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload]);

  const get = useCallback(
    (type: ChatType, id: string): ChatPref => prefs.get(prefKey(type, id)) ?? { chatType: type, chatId: id, ...EMPTY },
    [prefs],
  );

  const update = useCallback(
    async (type: ChatType, id: string, change: Partial<Pick<ChatPref, 'archived' | 'pinned' | 'folderId'>>) => {
      const key = prefKey(type, id);
      const before = prefs.get(key);
      setPrefs((prev) => {
        const next = new Map(prev);
        next.set(key, { ...(prev.get(key) ?? { chatType: type, chatId: id, ...EMPTY }), ...change });
        return next;
      });
      try {
        const res = await fetch('/api/chats/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatType: type, chatId: id, ...change }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not save');
      } catch (error) {
        setPrefs((prev) => {
          const next = new Map(prev);
          if (before) next.set(key, before);
          else next.delete(key);
          return next;
        });
        toast({ variant: 'destructive', title: 'Not saved', description: (error as Error).message });
      }
    },
    [prefs, toast],
  );

  const createFolder = useCallback(
    async (name: string): Promise<ChatFolder | null> => {
      const res = await fetch('/api/chats/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Folder not created', description: data.error });
        return null;
      }
      setFolders((prev) => [...prev, data.folder]);
      return data.folder;
    },
    [toast],
  );

  const renameFolder = useCallback(
    async (id: string, name: string) => {
      const res = await fetch(`/api/chats/folders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Rename failed', description: data.error });
        return;
      }
      setFolders((prev) => prev.map((f) => (f.id === id ? data.folder : f)));
    },
    [toast],
  );

  const deleteFolder = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/chats/folders/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Delete failed' });
        return;
      }
      setFolders((prev) => prev.filter((f) => f.id !== id));
      // Chats in the folder fall back to "All" (the server nulls folder_id).
      setPrefs((prev) => {
        const next = new Map(prev);
        next.forEach((p, k) => {
          if (p.folderId === id) next.set(k, { ...p, folderId: null });
        });
        return next;
      });
    },
    [toast],
  );

  return { prefs, folders, get, update, createFolder, renameFolder, deleteFolder, reload };
}

/** Name a new folder, or rename an existing one. */
export function FolderNameDialog({
  open,
  initialName = '',
  title,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  initialName?: string;
  title: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => void | Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setName(initialName);
  }, [open, initialName]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    await onSubmit(name.trim());
    setBusy(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>Folders group your chats and groups, like Work or Family.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            className="my-4"
            maxLength={30}
            placeholder="e.g. Work"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Folder name"
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || busy}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Rename or delete folders. */
export function ManageFoldersDialog({
  open,
  onOpenChange,
  folders,
  onRename,
  onDelete,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: ChatFolder[];
  onRename: (folder: ChatFolder) => void;
  onDelete: (folder: ChatFolder) => void;
  onCreate: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Folders</DialogTitle>
          <DialogDescription>Deleting a folder keeps its chats; they just move back to All.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1 py-2">
          {folders.length === 0 && <p className="text-sm text-muted-foreground">No folders yet.</p>}
          {folders.map((f) => (
            <div key={f.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50">
              <span className="flex-1 truncate text-sm">{f.name}</span>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onRename(f)} aria-label={`Rename ${f.name}`}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive"
                onClick={() => onDelete(f)}
                aria-label={`Delete ${f.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={onCreate}>New folder</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
