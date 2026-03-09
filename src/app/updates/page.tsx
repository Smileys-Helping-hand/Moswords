'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import UserAvatar from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Search,
  MoreVertical,
  Camera,
  Image as ImageIcon,
  Type,
  X,
  Eye,
  Trash2,
  ChevronUp,
  ChevronDown,
  Play,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { compressImage } from '@/lib/image-compress';

interface Status {
  id: string;
  userId: string;
  mediaUrl: string | null;
  mediaType: string;
  caption: string | null;
  backgroundColor: string | null;
  createdAt: string;
  expiresAt: string;
  displayName: string | null;
  name: string | null;
  email: string;
  photoURL: string | null;
  isViewed: boolean;
  viewCount: number;
  isOwn: boolean;
}

interface GroupedStatus {
  userId: string;
  displayName: string;
  photoURL: string | null;
  statuses: Status[];
  hasUnviewed: boolean;
  latestTime: string;
}

// ── Story Viewer ─────────────────────────────────────────────────────────────
function StatusViewer({
  groups,
  initialGroupIndex,
  onClose,
  onView,
  myUserId,
  onDelete,
}: {
  groups: GroupedStatus[];
  initialGroupIndex: number;
  onClose: () => void;
  onView: (statusId: string) => void;
  myUserId: string;
  onDelete: (statusId: string) => void;
}) {
  const [groupIdx, setGroupIdx] = useState(initialGroupIndex);
  const [statusIdx, setStatusIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const DURATION = 5000; // 5s per status

  const group = groups[groupIdx];
  const currentStatus = group?.statuses[statusIdx];

  const goNext = useCallback(() => {
    if (statusIdx < group.statuses.length - 1) {
      setStatusIdx((i) => i + 1);
      setProgress(0);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((i) => i + 1);
      setStatusIdx(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [statusIdx, groupIdx, group, groups, onClose]);

  const goPrev = () => {
    if (statusIdx > 0) {
      setStatusIdx((i) => i - 1);
      setProgress(0);
    } else if (groupIdx > 0) {
      setGroupIdx((i) => i - 1);
      setStatusIdx(0);
      setProgress(0);
    }
  };

  useEffect(() => {
    if (!currentStatus) return;
    if (!currentStatus.isOwn) onView(currentStatus.id);
    setProgress(0);
    timerRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          goNext();
          return 0;
        }
        return p + (100 / (DURATION / 100));
      });
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentStatus?.id]);

  if (!group || !currentStatus) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
    >
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 p-3 z-10">
        {group.statuses.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              style={{
                width: i < statusIdx ? '100%' : i === statusIdx ? `${progress}%` : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-8 left-0 right-0 flex items-center gap-3 px-4 z-10">
        <UserAvatar
          src={group.photoURL || ''}
          fallback={(group.displayName || 'U').substring(0, 2).toUpperCase()}
        />
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">{group.displayName}</p>
          <p className="text-white/60 text-xs">
            {formatDistanceToNow(new Date(currentStatus.createdAt), { addSuffix: true })}
          </p>
        </div>
        {currentStatus.isOwn && (
          <Button
            variant="ghost"
            size="icon"
            className="text-white/80 hover:text-white hover:bg-white/10"
            onClick={() => { onDelete(currentStatus.id); goNext(); }}
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-white/80 hover:text-white hover:bg-white/10"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center relative">
        {currentStatus.mediaType === 'image' && currentStatus.mediaUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentStatus.mediaUrl}
            alt="Status"
            className="max-h-full max-w-full object-contain"
          />
        )}
        {currentStatus.mediaType === 'video' && currentStatus.mediaUrl && (
          <video
            src={currentStatus.mediaUrl}
            autoPlay
            muted={false}
            className="max-h-full max-w-full object-contain"
            onEnded={goNext}
          />
        )}
        {currentStatus.mediaType === 'text' && (
          <div
            className="w-full h-full flex items-center justify-center p-12 text-center"
            style={{ backgroundColor: currentStatus.backgroundColor || '#1a1a2e' }}
          >
            <p className="text-white text-2xl font-bold leading-relaxed">
              {currentStatus.caption}
            </p>
          </div>
        )}

        {/* Tap zones */}
        <button className="absolute left-0 top-0 w-1/3 h-full" onClick={goPrev} />
        <button className="absolute right-0 top-0 w-1/3 h-full" onClick={goNext} />
      </div>

      {/* Caption */}
      {currentStatus.caption && currentStatus.mediaType !== 'text' && (
        <div className="absolute bottom-16 left-4 right-4 text-white text-sm bg-black/40 rounded-xl p-3 backdrop-blur-sm">
          {currentStatus.caption}
        </div>
      )}

      {/* View count (own statuses) */}
      {currentStatus.isOwn && (
        <div className="absolute bottom-4 left-4 flex items-center gap-1.5 text-white/70 text-xs">
          <Eye className="w-4 h-4" />
          <span>{currentStatus.viewCount} views</span>
        </div>
      )}
    </motion.div>
  );
}

// ── Main Updates Page ─────────────────────────────────────────────────────────
export default function UpdatesPage() {
  const { session, status } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const currentUserId = (session?.user as any)?.id;

  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerGroupIdx, setViewerGroupIdx] = useState(0);
  const [viewedCollapsed, setViewedCollapsed] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [textStatusModal, setTextStatusModal] = useState(false);
  const [textCaption, setTextCaption] = useState('');
  const [textBg, setTextBg] = useState('#1a1a2e');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const TEXT_BG_OPTIONS = [
    '#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560',
    '#2d6a4f', '#1b4332', '#6d597a', '#b56576', '#355070',
  ];

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (status !== 'authenticated') return;
    loadStatuses();
  }, [status]);

  const loadStatuses = async () => {
    try {
      const res = await fetch('/api/statuses');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStatuses(data.statuses || []);
    } catch {
      toast({ variant: 'destructive', title: 'Failed to load updates' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setShowAddMenu(false);
    try {
      let uploadFile: File = file;
      if (file.type.startsWith('image/')) {
        const compressed = await compressImage(file, 1200, 0.85);
        uploadFile = compressed;
      }

      const formData = new FormData();
      formData.append('file', uploadFile);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const { url } = await uploadRes.json();

      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      const res = await fetch('/api/statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaUrl: url, mediaType }),
      });
      if (!res.ok) throw new Error('Failed to post status');

      toast({ title: 'Status posted!', description: 'Visible for 24 hours' });
      loadStatuses();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to post status' });
    } finally {
      setUploading(false);
    }
  };

  const handleTextStatus = async () => {
    if (!textCaption.trim()) return;
    try {
      const res = await fetch('/api/statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaType: 'text', caption: textCaption, backgroundColor: textBg }),
      });
      if (!res.ok) throw new Error();
      toast({ title: 'Status posted!' });
      setTextStatusModal(false);
      setTextCaption('');
      loadStatuses();
    } catch {
      toast({ variant: 'destructive', title: 'Failed to post status' });
    }
  };

  const handleDeleteStatus = async (statusId: string) => {
    await fetch(`/api/statuses/${statusId}`, { method: 'DELETE' });
    setStatuses((prev) => prev.filter((s) => s.id !== statusId));
  };

  const markViewed = async (statusId: string) => {
    await fetch(`/api/statuses/${statusId}/view`, { method: 'POST' });
    setStatuses((prev) =>
      prev.map((s) => (s.id === statusId ? { ...s, isViewed: true } : s))
    );
  };

  // Group statuses by user
  const myStatuses = statuses.filter((s) => s.isOwn);
  const othersStatuses = statuses.filter((s) => !s.isOwn);

  const grouped: GroupedStatus[] = [];
  const seen = new Set<string>();
  for (const s of othersStatuses) {
    if (!seen.has(s.userId)) {
      seen.add(s.userId);
      const userStatuses = othersStatuses.filter((x) => x.userId === s.userId);
      grouped.push({
        userId: s.userId,
        displayName: s.displayName || s.name || s.email.split('@')[0],
        photoURL: s.photoURL,
        statuses: userStatuses,
        hasUnviewed: userStatuses.some((x) => !x.isViewed),
        latestTime: userStatuses[userStatuses.length - 1].createdAt,
      });
    }
  }

  const recentGroups = grouped.filter((g) => g.hasUnviewed);
  const viewedGroups = grouped.filter((g) => !g.hasUnviewed);

  // Build a flat list for viewer navigation (own first, then recent, then viewed)
  const myGroup: GroupedStatus | undefined = myStatuses.length > 0
    ? {
        userId: currentUserId,
        displayName: (session?.user?.name || session?.user?.email || 'Me') as string,
        photoURL: session?.user?.image || null,
        statuses: myStatuses,
        hasUnviewed: false,
        latestTime: myStatuses[myStatuses.length - 1].createdAt,
      }
    : undefined;

  const allGroups = [...(myGroup ? [myGroup] : []), ...recentGroups, ...viewedGroups];

  const openViewer = (groupIdx: number) => {
    setViewerGroupIdx(groupIdx);
    setViewerOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100dvh-4rem)] md:h-screen bg-background">
        <div className="sticky top-0 z-10 px-4 py-3 border-b border-border/40 flex items-center justify-between">
          <h1 className="text-xl font-bold">Updates</h1>
        </div>
        <div className="flex-1 p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-14 h-14 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-32" />
                <div className="h-3 bg-muted rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-[calc(100dvh-4rem)] md:h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 px-4 py-3 border-b border-border/40 glass-panel flex items-center gap-2">
          <h1 className="text-xl font-bold flex-1">Updates</h1>
          <Button variant="ghost" size="icon" aria-label="Search">
            <Search className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="More options">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── Status section ── */}
          <div className="px-2 pt-4 pb-2">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
              Status
            </p>

            {/* My status row */}
            <div className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-muted/40 transition-colors">
              <div className="relative">
                <button
                  onClick={() => myGroup ? openViewer(0) : setShowAddMenu(true)}
                  className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-primary/40 block"
                >
                  <UserAvatar
                    src={session?.user?.image || ''}
                    fallback={(session?.user?.name || 'Me').substring(0, 2).toUpperCase()}
                    size="lg"
                  />
                </button>
                <button
                  onClick={() => setShowAddMenu(true)}
                  className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-md"
                >
                  <Plus className="w-3 h-3 text-white" />
                </button>
              </div>
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => myGroup ? openViewer(0) : setShowAddMenu(true)}
              >
                <p className="font-semibold text-sm">My status</p>
                <p className="text-xs text-muted-foreground">
                  {myGroup
                    ? `${myStatuses.length} update${myStatuses.length > 1 ? 's' : ''} · ${formatDistanceToNow(new Date(myGroup.latestTime), { addSuffix: true })}`
                    : 'Tap to add status update'}
                </p>
              </div>
              {uploading && (
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            {/* Add status menu */}
            <AnimatePresence>
              {showAddMenu && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 px-2 py-2">
                    <button
                      onClick={() => { setShowAddMenu(false); fileInputRef.current?.click(); }}
                      className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors border border-primary/20"
                    >
                      <Camera className="w-5 h-5 text-primary" />
                      <span className="text-xs font-medium text-primary">Photo/Video</span>
                    </button>
                    <button
                      onClick={() => { setShowAddMenu(false); setTextStatusModal(true); }}
                      className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 transition-colors border border-violet-500/20"
                    >
                      <Type className="w-5 h-5 text-violet-400" />
                      <span className="text-xs font-medium text-violet-400">Text</span>
                    </button>
                    <button
                      onClick={() => setShowAddMenu(false)}
                      className="flex flex-col items-center gap-1.5 py-3 px-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors"
                    >
                      <X className="w-5 h-5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">Cancel</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Recent updates ── */}
          {recentGroups.length > 0 && (
            <div className="px-2 pb-2">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                Recent updates
              </p>
              {recentGroups.map((group, i) => {
                const viewerIdx = allGroups.findIndex((g) => g.userId === group.userId);
                return (
                  <StatusRow
                    key={group.userId}
                    group={group}
                    onClick={() => openViewer(viewerIdx)}
                    unviewed
                  />
                );
              })}
            </div>
          )}

          {/* ── Viewed updates ── */}
          {viewedGroups.length > 0 && (
            <div className="px-2 pb-4">
              <button
                onClick={() => setViewedCollapsed((v) => !v)}
                className="w-full flex items-center justify-between px-2 py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
              >
                <span>Viewed updates</span>
                {viewedCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              <AnimatePresence>
                {!viewedCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    {viewedGroups.map((group) => {
                      const viewerIdx = allGroups.findIndex((g) => g.userId === group.userId);
                      return (
                        <StatusRow
                          key={group.userId}
                          group={group}
                          onClick={() => openViewer(viewerIdx)}
                        />
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {recentGroups.length === 0 && viewedGroups.length === 0 && !myGroup && !loading && (
            <div className="text-center py-16 text-muted-foreground px-8">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="w-10 h-10 text-primary/40" />
              </div>
              <p className="font-semibold mb-1">No updates yet</p>
              <p className="text-sm">Status updates from your contacts appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Story Viewer */}
      <AnimatePresence>
        {viewerOpen && allGroups.length > 0 && (
          <StatusViewer
            groups={allGroups}
            initialGroupIndex={viewerGroupIdx}
            onClose={() => setViewerOpen(false)}
            onView={markViewed}
            myUserId={currentUserId}
            onDelete={handleDeleteStatus}
          />
        )}
      </AnimatePresence>

      {/* Text status modal */}
      <AnimatePresence>
        {textStatusModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ backgroundColor: textBg }}
          >
            <div className="flex items-center gap-2 p-4">
              <Button variant="ghost" size="icon" onClick={() => setTextStatusModal(false)}>
                <X className="w-5 h-5 text-white" />
              </Button>
              <span className="text-white font-semibold flex-1">Text status</span>
              <Button
                onClick={handleTextStatus}
                disabled={!textCaption.trim()}
                className="bg-primary text-white"
              >
                Post
              </Button>
            </div>

            <div className="flex-1 flex items-center justify-center p-8">
              <textarea
                autoFocus
                value={textCaption}
                onChange={(e) => setTextCaption(e.target.value)}
                placeholder="Type a status..."
                maxLength={700}
                className="w-full bg-transparent text-white text-2xl font-bold text-center placeholder:text-white/40 outline-none resize-none leading-relaxed"
                rows={4}
              />
            </div>

            {/* Background colour selector */}
            <div className="flex gap-2 p-4 justify-center">
              {TEXT_BG_OPTIONS.map((bg) => (
                <button
                  key={bg}
                  onClick={() => setTextBg(bg)}
                  className={`w-8 h-8 rounded-full transition-transform ${textBg === bg ? 'scale-125 ring-2 ring-white' : ''}`}
                  style={{ backgroundColor: bg }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
          e.target.value = '';
        }}
      />
    </>
  );
}

// ── Status row component ──────────────────────────────────────────────────────
function StatusRow({
  group,
  onClick,
  unviewed = false,
}: {
  group: GroupedStatus;
  onClick: () => void;
  unviewed?: boolean;
}) {
  const preview = group.statuses[group.statuses.length - 1];
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-muted/40 active:bg-muted/60 transition-colors text-left"
    >
      <div className="relative">
        <div
          className={`w-14 h-14 rounded-full p-[2.5px] ${
            unviewed
              ? 'bg-gradient-to-br from-primary via-violet-500 to-pink-500'
              : 'bg-muted'
          }`}
        >
          <div className="w-full h-full rounded-full overflow-hidden bg-background">
            <UserAvatar
              src={group.photoURL || ''}
              fallback={(group.displayName || 'U').substring(0, 2).toUpperCase()}
              size="lg"
            />
          </div>
        </div>
        {preview.mediaType === 'video' && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary/80 flex items-center justify-center">
            <Play className="w-3 h-3 text-white fill-white" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${unviewed ? 'font-bold' : 'font-medium text-foreground/80'}`}>
          {group.displayName}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(group.latestTime), { addSuffix: true })}
        </p>
      </div>
    </button>
  );
}
