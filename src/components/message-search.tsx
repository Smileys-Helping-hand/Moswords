'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Hash, MessageCircle, Search, Users } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface Result {
  kind: 'dm' | 'group' | 'channel';
  id: string;
  href: string;
  title: string;
  senderName: string;
  snippet: string;
  createdAt: string;
}

export const OPEN_MESSAGE_SEARCH = 'open-message-search';

/** Open the global search from anywhere, optionally pre-filled. */
export function openMessageSearch(initialQuery?: unknown) {
  const detail = typeof initialQuery === 'string' ? initialQuery : '';
  window.dispatchEvent(new CustomEvent(OPEN_MESSAGE_SEARCH, { detail }));
}

const ICONS = { dm: MessageCircle, group: Users, channel: Hash } as const;

/**
 * Global message search (Ctrl/Cmd+K). Searches the user's DMs, groups and
 * server channels. End-to-end encrypted messages aren't searchable server-side.
 */
export default function MessageSearch() {
  const { status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = (e: Event) => {
      const initial = (e as CustomEvent<string>).detail;
      if (initial) setQuery(initial);
      setOpen(true);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_MESSAGE_SEARCH, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_MESSAGE_SEARCH, onOpen);
    };
  }, []);

  // Debounced search; stale responses are dropped.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = ++requestId.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = res.ok ? await res.json() : { results: [] };
        if (id === requestId.current) {
          setResults(data.results ?? []);
          setActive(0);
        }
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const go = (r: Result) => {
    setOpen(false);
    setQuery('');
    router.push(r.href);
  };

  if (status !== 'authenticated') return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Search messages</DialogTitle>
        <DialogDescription className="sr-only">Search your chats, groups and channels</DialogDescription>
        <div className="flex items-center gap-2 border-b border-border/60 px-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              if (e.key === 'Enter' && results[active]) go(results[active]);
            }}
            placeholder="Search messages…"
            className="border-0 shadow-none focus-visible:ring-0 h-12 px-0"
            aria-label="Search messages"
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-1" role="listbox">
          {query.trim().length < 2 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Type at least 2 characters. <span className="hidden sm:inline">Tip: Ctrl/⌘ K opens this anywhere.</span>
            </p>
          ) : loading && results.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Searching…</p>
          ) : results.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No messages found. Encrypted messages can&apos;t be searched.
            </p>
          ) : (
            results.map((r, i) => {
              const Icon = ICONS[r.kind];
              return (
                <button
                  key={`${r.kind}-${r.id}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r)}
                  className={`w-full text-left rounded-md px-3 py-2 flex gap-3 items-start ${
                    i === active ? 'bg-primary/10' : 'hover:bg-muted/60'
                  }`}
                >
                  <Icon className="h-4 w-4 mt-1 text-primary shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium truncate">{r.title}</span>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {formatDistanceToNowStrict(new Date(r.createdAt), { addSuffix: true })}
                      </span>
                    </span>
                    <span className="block text-xs text-muted-foreground truncate">
                      <span className="text-foreground/80">{r.senderName}:</span> {r.snippet}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
