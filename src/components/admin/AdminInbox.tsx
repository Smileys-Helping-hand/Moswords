'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CheckCircle2,
  Inbox,
  Loader2,
  Mail,
  MailOpen,
  Paperclip,
  PenSquare,
  RefreshCw,
  Reply,
  Send,
  TriangleAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface MailSummary {
  id: string;
  from: string;
  to: string[];
  subject: string | null;
  snippet: string;
  attachments: number;
  receivedAt: string;
  readAt: string | null;
  repliedAt: string | null;
}

interface MailDetail {
  id: string;
  from: string;
  to: string[];
  cc: string[];
  subject: string | null;
  text: string | null;
  html: string | null;
  attachments: { id: string; filename: string; contentType: string; size?: number }[];
  authentication: Record<string, string>;
  receivedAt: string;
  repliedAt: string | null;
  archivedAt: string | null;
}

interface MailStatus {
  sendingConfigured: boolean;
  receivingConfigured: boolean;
  domain: { status: string; sending: string; receiving: string } | null;
}

const ago = (iso: string) => formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
const senderName = (from: string) => from.replace(/<[^>]+>/, '').replace(/"/g, '').trim() || from;

/** Received mail for @awehchat.co.za, with reply, compose and archive. */
export default function AdminInbox({
  composeTo,
  onComposeHandled,
  onUnreadChange,
}: {
  composeTo?: string | null;
  onComposeHandled?: () => void;
  onUnreadChange?: (n: number) => void;
}) {
  const { toast } = useToast();
  const [view, setView] = useState<'inbox' | 'archived'>('inbox');
  const [emails, setEmails] = useState<MailSummary[]>([]);
  const [status, setStatus] = useState<MailStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MailDetail | null>(null);
  const [showHtml, setShowHtml] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [compose, setCompose] = useState<{ to: string; subject: string; text: string; fromLocal: string } | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    onUnreadChange?.(unread);
  }, [unread, onUnreadChange]);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/admin/inbox?view=${view}`, { cache: 'no-store' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEmails(data.emails);
      setStatus(data.mail);
      setUnread(data.unread);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    load();
  }, [load]);

  // Deep link from a forwarded email: /admin?tab=inbox&mail=<id>
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('mail');
    if (id) setOpenId(id);
  }, []);

  useEffect(() => {
    if (composeTo) {
      setCompose({ to: composeTo, subject: '', text: '', fromLocal: 'support' });
      onComposeHandled?.();
    }
  }, [composeTo, onComposeHandled]);

  useEffect(() => {
    if (!openId) return setDetail(null);
    let cancelled = false;
    setDetail(null);
    setReply('');
    fetch(`/api/admin/inbox/${openId}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (cancelled) return;
        setDetail(data.email);
        setShowHtml(!!data.email.html);
        if (data.wasUnread && !data.email.archivedAt) setUnread((n) => Math.max(0, n - 1));
        setEmails((prev) => prev.map((e) => (e.id === openId ? { ...e, readAt: e.readAt ?? new Date().toISOString() } : e)));
      })
      .catch(() => {
        if (!cancelled) {
          toast({ variant: 'destructive', title: 'Could not open that email' });
          setOpenId(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [openId, toast]);

  const patch = async (id: string, action: 'archive' | 'unarchive' | 'unread') => {
    const res = await fetch(`/api/admin/inbox/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) return toast({ variant: 'destructive', title: 'Could not update the email' });
    if (action !== 'unread') {
      setOpenId(null);
      toast({ title: action === 'archive' ? 'Archived' : 'Moved to inbox' });
    } else {
      setOpenId(null);
    }
    load();
  };

  const sendReply = async () => {
    if (!detail || !reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/inbox/${detail.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: reply }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Reply failed');
      toast({ title: 'Reply sent', description: senderName(detail.from) });
      setReply('');
      setDetail({ ...detail, repliedAt: new Date().toISOString() });
      load();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Not sent', description: (error as Error).message });
    } finally {
      setSending(false);
    }
  };

  const sendNew = async () => {
    if (!compose) return;
    setSending(true);
    try {
      const res = await fetch('/api/admin/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(compose),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Send failed');
      toast({ title: 'Email sent', description: compose.to });
      setCompose(null);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Not sent', description: (error as Error).message });
    } finally {
      setSending(false);
    }
  };

  const domain = status?.domain;
  const verified = domain?.status === 'verified';

  return (
    <section aria-label="Inbox" className="space-y-3">
      <div className="flex items-center gap-2">
        <Inbox className="w-5 h-5 text-primary" />
        <h2 className="font-semibold">Email</h2>
        <div className="ml-auto flex gap-1.5">
          <Button variant="ghost" size="icon" onClick={load} aria-label="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={() => setCompose({ to: '', subject: '', text: '', fromLocal: 'support' })}>
            <PenSquare className="w-4 h-4 mr-1" /> New email
          </Button>
        </div>
      </div>

      {status && (
        <div
          className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${
            verified ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'
          }`}
        >
          {verified ? <CheckCircle2 className="mt-0.5 w-4 h-4 shrink-0 text-emerald-500" /> : <TriangleAlert className="mt-0.5 w-4 h-4 shrink-0 text-amber-500" />}
          <p className="text-muted-foreground">
            {!status.sendingConfigured
              ? 'Email is not configured on the server (RESEND_API_KEY missing).'
              : verified
                ? <>Mail for <b>anything@awehchat.co.za</b> arrives here (support@, hello@ …). Replies go out from the address it was sent to.</>
                : <>Domain check with Resend: <b>{domain?.status ?? 'unknown'}</b>. Sending and receiving start once DNS is verified, usually within minutes.</>}
          </p>
        </div>
      )}

      <div className="flex gap-1.5" role="tablist" aria-label="Mail folders">
        {(['inbox', 'archived'] as const).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            onClick={() => { setView(v); setOpenId(null); }}
            className={`rounded-full px-3 h-7 text-xs font-medium capitalize ${
              view === v ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground hover:bg-muted'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* List (hidden on phones while a message is open) */}
        <div className={`divide-y divide-border/40 rounded-2xl border border-border/50 bg-card ${openId ? 'hidden md:block' : ''}`}>
          {failed && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Could not load mail. <button className="text-primary underline" onClick={load}>Try again</button>
            </div>
          )}
          {!failed && !loading && emails.length === 0 && (
            <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <Mail className="w-8 h-8 opacity-50" />
              {view === 'inbox' ? 'No email yet. Anything sent to @awehchat.co.za shows up here.' : 'Nothing archived.'}
            </div>
          )}
          {emails.map((e) => (
            <button
              key={e.id}
              onClick={() => setOpenId(e.id)}
              className={`block w-full p-3 text-left hover:bg-muted/40 ${openId === e.id ? 'bg-muted/50' : ''}`}
            >
              <div className="flex items-center gap-2">
                {!e.readAt && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                <span className={`truncate text-sm ${e.readAt ? '' : 'font-semibold'}`}>{senderName(e.from)}</span>
                <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{ago(e.receivedAt)}</span>
              </div>
              <p className={`truncate text-sm ${e.readAt ? 'text-muted-foreground' : ''}`}>{e.subject || '(no subject)'}</p>
              <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                {e.repliedAt && <Reply className="w-3 h-3 shrink-0" aria-label="Replied" />}
                {e.attachments > 0 && <Paperclip className="w-3 h-3 shrink-0" aria-label="Has attachments" />}
                <span className="truncate">{e.snippet}</span>
              </p>
            </button>
          ))}
          {loading && emails.length === 0 && (
            <div className="flex justify-center p-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          )}
        </div>

        {/* Reader */}
        <div className={`rounded-2xl border border-border/50 bg-card ${openId ? '' : 'hidden md:block'}`}>
          {!openId && (
            <div className="flex h-full min-h-48 items-center justify-center p-6 text-sm text-muted-foreground">Select an email to read it.</div>
          )}
          {openId && !detail && (
            <div className="flex min-h-48 items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          )}
          {detail && (
            <div className="flex flex-col">
              <div className="flex items-center gap-1 border-b border-border/40 p-2">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpenId(null)} aria-label="Back to list">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="ml-auto flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => patch(detail.id, 'unread')}>
                    <MailOpen className="w-4 h-4 mr-1" /> Unread
                  </Button>
                  {detail.archivedAt ? (
                    <Button variant="ghost" size="sm" onClick={() => patch(detail.id, 'unarchive')}>
                      <ArchiveRestore className="w-4 h-4 mr-1" /> Inbox
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => patch(detail.id, 'archive')}>
                      <Archive className="w-4 h-4 mr-1" /> Archive
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-1 p-4 pb-2">
                <h3 className="text-base font-semibold break-words">{detail.subject || '(no subject)'}</h3>
                <p className="text-xs text-muted-foreground break-all"><b>From</b> {detail.from}</p>
                <p className="text-xs text-muted-foreground break-all"><b>To</b> {detail.to.join(', ')}{detail.cc.length ? ` · cc ${detail.cc.join(', ')}` : ''}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(detail.receivedAt).toLocaleString()}
                  {detail.authentication.spf === 'fail' && detail.authentication.dkim === 'fail' && (
                    <span className="ml-2 text-destructive">⚠ sender not verified — could be spoofed</span>
                  )}
                </p>
                {detail.html && detail.text && (
                  <button className="text-xs text-primary underline" onClick={() => setShowHtml(!showHtml)}>
                    {showHtml ? 'Show plain text' : 'Show formatted'}
                  </button>
                )}
              </div>
              <div className="px-4">
                {showHtml && detail.html ? (
                  // No scripts, no same-origin access; links open in a new tab.
                  <iframe
                    title="Email content"
                    sandbox="allow-popups allow-popups-to-escape-sandbox"
                    srcDoc={`<base target="_blank"><style>body{font-family:system-ui,sans-serif;margin:0;color:#111;background:#fff;word-wrap:break-word}img{max-width:100%;height:auto}</style>${detail.html}`}
                    className="h-[50vh] w-full rounded-lg border border-border/40 bg-white"
                  />
                ) : (
                  <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted/40 p-3 text-sm font-sans">
                    {detail.text || '(empty message)'}
                  </pre>
                )}
              </div>
              {detail.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 px-4 pt-3">
                  {detail.attachments.map((a) => (
                    <a
                      key={a.id}
                      href={`/api/admin/inbox/${detail.id}/attachments/${a.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-full border border-border/50 px-3 py-1 text-xs hover:bg-muted"
                    >
                      <Paperclip className="w-3 h-3" /> {a.filename}
                      {a.size ? <span className="text-muted-foreground">({Math.ceil(a.size / 1024)} KB)</span> : null}
                    </a>
                  ))}
                </div>
              )}
              <div className="space-y-2 p-4">
                {detail.repliedAt && <p className="text-xs text-muted-foreground">You replied {ago(detail.repliedAt)}.</p>}
                <Textarea
                  placeholder={`Reply to ${senderName(detail.from)}…`}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  maxLength={50_000}
                />
                <div className="flex justify-end">
                  <Button onClick={sendReply} disabled={sending || !reply.trim()}>
                    {sending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />} Send reply
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!compose} onOpenChange={(o) => !o && setCompose(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New email</DialogTitle>
            <DialogDescription>Sent from your awehchat.co.za address through Resend.</DialogDescription>
          </DialogHeader>
          {compose && (
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-sm">
                <span className="text-muted-foreground">From</span>
                <Input
                  className="h-8 w-32"
                  value={compose.fromLocal}
                  onChange={(e) => setCompose({ ...compose, fromLocal: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') })}
                  aria-label="Sender name before @"
                />
                <span className="text-muted-foreground">@awehchat.co.za</span>
              </div>
              <Input type="email" placeholder="To" value={compose.to} onChange={(e) => setCompose({ ...compose, to: e.target.value })} autoCapitalize="none" />
              <Input placeholder="Subject" value={compose.subject} maxLength={300} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} />
              <Textarea placeholder="Message" rows={8} value={compose.text} maxLength={50_000} onChange={(e) => setCompose({ ...compose, text: e.target.value })} />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCompose(null)}>Cancel</Button>
            <Button onClick={sendNew} disabled={sending || !compose?.to || !compose?.subject.trim() || !compose?.text.trim()}>
              {sending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />} Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
