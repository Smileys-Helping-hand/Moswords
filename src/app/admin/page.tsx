'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  ArrowLeft,
  Ban,
  Copy,
  KeyRound,
  Loader2,
  MoreVertical,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import UserAvatar from '@/components/user-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { isOnline } from '@/lib/presence';

type Stats = Record<
  | 'users' | 'new_today' | 'new_week' | 'active_today' | 'online_now' | 'suspended'
  | 'dms_today' | 'group_messages_today' | 'groups' | 'friendships' | 'pending_requests',
  number
>;

interface Account {
  id: string;
  email: string;
  name: string;
  photoURL: string | null;
  createdAt: string | null;
  lastSeen: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  friends: number;
  messages: number;
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active today' },
  { id: 'new', label: 'New this week' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'admins', label: 'Admins' },
];

const ago = (iso: string | null) => (iso ? formatDistanceToNowStrict(new Date(iso), { addSuffix: true }) : '—');

export default function AdminDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [state, setState] = useState<'loading' | 'forbidden' | 'error' | 'ready'>('loading');
  const [stats, setStats] = useState<Stats | null>(null);
  const [signups, setSignups] = useState<{ day: string; signups: number }[]>([]);
  const [you, setYou] = useState<{ email: string; isSuperAdmin: boolean } | null>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [listLoading, setListLoading] = useState(false);
  const requestId = useRef(0);

  const [suspendTarget, setSuspendTarget] = useState<Account | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [resetLink, setResetLink] = useState<{ who: string; link: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const loadOverview = useCallback(async () => {
    const res = await fetch('/api/admin/overview', { cache: 'no-store' });
    if (res.status === 401 || res.status === 403) return setState('forbidden');
    if (!res.ok) return setState('error');
    const data = await res.json();
    setStats(data.stats);
    setSignups(data.signups);
    setYou(data.you);
    setState('ready');
  }, []);

  const loadAccounts = useCallback(async (nextPage: number, append: boolean) => {
    const id = ++requestId.current;
    setListLoading(true);
    try {
      const params = new URLSearchParams({ q: query, filter, page: String(nextPage) });
      const res = await fetch(`/api/admin/accounts?${params}`, { cache: 'no-store' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (id !== requestId.current) return;
      setAccounts((prev) => (append ? [...prev, ...data.accounts] : data.accounts));
      setTotal(data.total);
      setPage(nextPage);
    } catch {
      if (id === requestId.current) toast({ variant: 'destructive', title: 'Could not load users' });
    } finally {
      if (id === requestId.current) setListLoading(false);
    }
  }, [query, filter, toast]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  // Debounced search / filter.
  useEffect(() => {
    if (state !== 'ready') return;
    const t = setTimeout(() => loadAccounts(0, false), 250);
    return () => clearTimeout(t);
  }, [state, loadAccounts]);

  const act = async (account: Account, action: string, extra: Record<string, unknown> = {}) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Action failed');
      toast({ title: 'Done', description: `${account.name}: ${action.replace('_', ' ')}` });
      await Promise.all([loadAccounts(0, false), loadOverview()]);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not do that', description: (error as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const createResetLink = async (account: Account) => {
    const res = await fetch(`/api/admin/accounts/${account.id}/reset-link`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({ variant: 'destructive', title: 'Could not create a link', description: data.error });
      return;
    }
    setResetLink({ who: account.name, link: data.link });
  };

  const deleteAccount = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/accounts/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmEmail: deleteConfirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      toast({ title: 'Account deleted', description: deleteTarget.email });
      setDeleteTarget(null);
      setDeleteConfirm('');
      await Promise.all([loadAccounts(0, false), loadOverview()]);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not delete', description: (error as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (state !== 'ready') {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <ShieldOff className="w-10 h-10 text-muted-foreground" />
        <h1 className="text-lg font-semibold">{state === 'forbidden' ? 'Admins only' : 'Could not load the dashboard'}</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          {state === 'forbidden'
            ? 'This area is for Moswords administrators.'
            : 'Check your connection and try again.'}
        </p>
        <Button variant="outline" onClick={() => router.push('/dm')}>Back to chats</Button>
      </div>
    );
  }

  const maxSignups = Math.max(1, ...signups.map((s) => s.signups));
  const tiles: { label: string; value: number | undefined; hint?: string }[] = [
    { label: 'Users', value: stats?.users, hint: `${stats?.new_week ?? 0} new this week` },
    { label: 'Active today', value: stats?.active_today, hint: `${stats?.online_now ?? 0} online now` },
    { label: 'Messages today', value: (stats?.dms_today ?? 0) + (stats?.group_messages_today ?? 0), hint: `${stats?.group_messages_today ?? 0} in groups` },
    { label: 'Friendships', value: stats?.friendships, hint: `${stats?.pending_requests ?? 0} requests pending` },
    { label: 'Groups', value: stats?.groups },
    { label: 'New today', value: stats?.new_today },
    { label: 'Suspended', value: stats?.suspended },
  ];

  return (
    <div className="min-h-[100dvh] bg-background pb-24 md:pb-8">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/40 bg-background/95 px-4 py-3 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => router.push('/settings')} aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold leading-tight">Admin dashboard</h1>
          <p className="text-xs text-muted-foreground truncate">
            Signed in as {you?.email}{you?.isSuperAdmin ? ' · owner' : ''}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push('/ecosystem')}>
          <KeyRound className="w-4 h-4 mr-1" /> API keys
        </Button>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 p-4">
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Key numbers">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-2xl border border-border/50 bg-card p-4">
              <p className="text-xs text-muted-foreground">{t.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{t.value ?? 0}</p>
              {t.hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{t.hint}</p>}
            </div>
          ))}
          <div className="col-span-2 rounded-2xl border border-border/50 bg-card p-4 md:col-span-1">
            <p className="text-xs text-muted-foreground">Sign-ups, last 14 days</p>
            <div className="mt-2 flex h-14 items-end gap-1" role="img" aria-label="Daily sign-ups for the last 14 days">
              {signups.map((s) => (
                <div
                  key={s.day}
                  title={`${s.day}: ${s.signups}`}
                  className="flex-1 rounded-sm bg-primary/70"
                  style={{ height: `${Math.max(4, (s.signups / maxSignups) * 100)}%` }}
                />
              ))}
            </div>
          </div>
        </section>

        <section aria-label="Users" className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Users</h2>
            <span className="text-sm text-muted-foreground">({total})</span>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>

          <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label="User filters">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`shrink-0 rounded-full px-3 h-7 text-xs font-medium ${
                  filter === f.id ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="divide-y divide-border/40 rounded-2xl border border-border/50 bg-card">
            {accounts.length === 0 && !listLoading && (
              <p className="p-6 text-center text-sm text-muted-foreground">No users match.</p>
            )}
            {accounts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3">
                <UserAvatar src={a.photoURL || ''} fallback={a.name.substring(0, 2).toUpperCase()} status={isOnline(a.lastSeen) ? 'online' : 'offline'} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                    <span className="truncate">{a.name}</span>
                    {a.isSuperAdmin && <span className="rounded bg-primary/20 px-1.5 text-[10px] text-primary">Owner</span>}
                    {!a.isSuperAdmin && a.isAdmin && <span className="rounded bg-primary/15 px-1.5 text-[10px] text-primary">Admin</span>}
                    {a.suspendedAt && <span className="rounded bg-destructive/15 px-1.5 text-[10px] text-destructive">Suspended</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{a.email}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Joined {ago(a.createdAt)} · seen {ago(a.lastSeen)} · {a.friends} friends · {a.messages} messages
                  </p>
                  {a.suspendedReason && <p className="text-[11px] text-destructive">Reason: {a.suspendedReason}</p>}
                </div>
                {!a.isSuperAdmin && a.email !== you?.email && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={busy} aria-label={`Actions for ${a.name}`}>
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => createResetLink(a)}>
                        <RotateCcw className="w-4 h-4 mr-2" /> Password reset link
                      </DropdownMenuItem>
                      {a.suspendedAt ? (
                        <DropdownMenuItem onClick={() => act(a, 'unsuspend')}>
                          <ShieldCheck className="w-4 h-4 mr-2" /> Unsuspend
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => { setSuspendTarget(a); setSuspendReason(''); }}>
                          <Ban className="w-4 h-4 mr-2" /> Suspend…
                        </DropdownMenuItem>
                      )}
                      {you?.isSuperAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => act(a, a.isAdmin ? 'remove_admin' : 'make_admin')}>
                            {a.isAdmin ? <ShieldOff className="w-4 h-4 mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                            {a.isAdmin ? 'Remove admin' : 'Make admin'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            onClick={() => { setDeleteTarget(a); setDeleteConfirm(''); }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete account…
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
            {listLoading && (
              <div className="flex justify-center p-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            )}
          </div>

          {accounts.length < total && !listLoading && (
            <Button variant="outline" className="w-full" onClick={() => loadAccounts(page + 1, true)}>
              Load more ({total - accounts.length} remaining)
            </Button>
          )}
        </section>
      </main>

      {/* Suspend */}
      <Dialog open={!!suspendTarget} onOpenChange={(o) => !o && setSuspendTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Suspend {suspendTarget?.name}?</DialogTitle>
            <DialogDescription>
              They are signed out within a minute and can&apos;t sign in until you unsuspend them. Nothing is deleted.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Reason (optional, visible to admins)"
            value={suspendReason}
            maxLength={300}
            onChange={(e) => setSuspendReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSuspendTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                if (!suspendTarget) return;
                await act(suspendTarget, 'suspend', { reason: suspendReason });
                setSuspendTarget(null);
              }}
            >
              Suspend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name}&apos;s account?</DialogTitle>
            <DialogDescription>
              This permanently removes the account and their messages. Groups they created pass to another member.
              Type <strong>{deleteTarget?.email}</strong> to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder={deleteTarget?.email} autoCapitalize="none" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={busy || deleteConfirm.trim().toLowerCase() !== deleteTarget?.email.toLowerCase()}
              onClick={deleteAccount}
            >
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset link */}
      <Dialog open={!!resetLink} onOpenChange={(o) => !o && setResetLink(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset link for {resetLink?.who}</DialogTitle>
            <DialogDescription>Works once and expires in 1 hour. Send it to them privately.</DialogDescription>
          </DialogHeader>
          <code className="block break-all rounded bg-muted p-2 text-xs">{resetLink?.link}</code>
          <DialogFooter>
            <Button
              onClick={async () => {
                if (!resetLink) return;
                await navigator.clipboard.writeText(resetLink.link).catch(() => {});
                toast({ title: 'Link copied' });
              }}
            >
              <Copy className="w-4 h-4 mr-1" /> Copy link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
