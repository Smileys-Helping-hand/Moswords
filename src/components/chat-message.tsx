"use client";

import { memo } from 'react';
import type { OptimisticMessage } from '@/hooks/use-chat';
import UserAvatar from './user-avatar';
import { Button } from './ui/button';
import { ShieldAlert, RefreshCw, X, ZoomIn, Check, CheckCheck, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isYesterday, parseISO, isValid } from 'date-fns';
import Image from 'next/image';
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: OptimisticMessage;
  showAvatar: boolean;
  isGrouped?: boolean;
  isLastInGroup?: boolean;
  isCurrentUser?: boolean;
  onRetry?: () => void;
  onDelete?: () => void;
}

function formatBubbleTime(timestamp: unknown): string {
  try {
    let date: Date | null = null;
    if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
      date = new Date((timestamp as { seconds: number }).seconds * 1000);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string') {
      date = parseISO(timestamp);
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    }
    if (!date || !isValid(date)) return 'Now';
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  } catch {
    return 'Now';
  }
}

/** Read receipt tick shown only on own messages */
function ReadReceiptIcon({
  status,
  readStatus,
}: {
  status?: string;
  readStatus?: string;
}) {
  if (status === 'sending') {
    return <Clock className="w-3 h-3 opacity-50 shrink-0" aria-label="Sending" />;
  }
  if (status === 'error') return null;
  const isRead = readStatus === 'read';
  const isDelivered = readStatus === 'delivered' || isRead;
  if (isDelivered) {
    return (
      <CheckCheck
        className={cn('w-3.5 h-3.5 shrink-0', isRead ? 'text-sky-300' : 'opacity-60')}
        aria-label={isRead ? 'Read' : 'Delivered'}
      />
    );
  }
  return <Check className="w-3 h-3 opacity-60 shrink-0" aria-label="Sent" />;
}

function ChatMessage({
  message,
  showAvatar,
  isGrouped = false,
  isCurrentUser = false,
  onRetry,
  onDelete,
}: ChatMessageProps) {
  const isSending = message.status === 'sending';
  const isError = message.status === 'error';
  const timeStr = formatBubbleTime(message.timestamp);

  // ── GIF — no bubble background, just the animated image ─────────────────
  if (message.mediaType === 'gif' && message.mediaUrl) {
    return (
      <motion.div
        className={cn(
          'flex items-end gap-2 px-3',
          isGrouped ? 'mt-0.5' : showAvatar ? 'mt-3' : 'mt-0.5',
          isCurrentUser ? 'flex-row-reverse' : 'flex-row',
        )}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        <div className={cn('w-8 h-8 shrink-0', isCurrentUser && 'invisible')} />
        <div className={cn('flex flex-col', isCurrentUser ? 'items-end' : 'items-start')}>
          <div className="relative rounded-2xl overflow-hidden shadow-md" style={{ maxWidth: 240 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={message.mediaUrl} alt="GIF" className="w-full block" loading="lazy" />
            <div
              className={cn(
                'absolute bottom-1.5 right-2 text-[10px] text-white/70 tabular-nums',
              )}
            >
              {timeStr}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Sticker — transparent PNG with white drop-shadow border ──────────────
  if (message.mediaType === 'sticker' && message.mediaUrl) {
    return (
      <motion.div
        className={cn(
          'flex items-end gap-2 px-3',
          isGrouped ? 'mt-0.5' : showAvatar ? 'mt-3' : 'mt-0.5',
          isCurrentUser ? 'flex-row-reverse' : 'flex-row',
        )}
        initial={{ opacity: 0, y: 5, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      >
        <div className={cn('w-8 h-8 shrink-0', isCurrentUser && 'invisible')} />
        <div className={cn('flex flex-col', isCurrentUser ? 'items-end' : 'items-start')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={message.mediaUrl}
            alt="Sticker"
            className="w-28 h-28 object-contain select-none"
            style={{ filter: 'drop-shadow(0 0 5px white) drop-shadow(0 0 2px white)' }}
            loading="lazy"
          />
          <span className="text-[10px] text-muted-foreground/60 tabular-nums mt-0.5 px-1">
            {timeStr}
          </span>
        </div>
      </motion.div>
    );
  }

  // ── Flagged / toxicity warning ─────────────────────────────────────
  if (message.isFlagged && !isError) {
    return (
      <motion.div
        className={cn(
          'flex items-start gap-2 px-3',
          showAvatar ? 'mt-3' : 'mt-0.5',
          isCurrentUser ? 'flex-row-reverse' : 'flex-row',
        )}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-8 shrink-0" />
        <div className="max-w-[75%] text-sm italic flex items-start gap-2 rounded-2xl bg-yellow-500/10 p-3 border border-yellow-500/30 text-yellow-200">
          <ShieldAlert className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold not-italic text-yellow-300 block text-xs mb-0.5">
              AI Sentinel
            </span>
            <p className="not-italic">{message.toxicityReason}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Whether the content is just a media placeholder string
  const isMediaPlaceholder =
    message.mediaUrl &&
    ['📷 Image', '🎬 Video', '🎵 Audio', '📎 File', '🎞️ GIF', '🎨 Sticker'].includes(message.content);

  // ── Bubble styling ─────────────────────────────────────────────────
  const bubbleCls = cn(
    'relative max-w-full min-w-[80px] text-sm shadow-md transition-opacity duration-150',
    isCurrentUser
      ? cn(
          'bg-[hsl(var(--bubble-out))] text-[hsl(var(--bubble-out-fg))]',
          // Telegram-style: fully rounded except top-right "tail"
          isGrouped ? 'rounded-[18px]' : 'rounded-[18px] rounded-tr-[5px]',
        )
      : cn(
          'bg-[hsl(var(--bubble-in))] text-[hsl(var(--bubble-in-fg))]',
          // top-left tail for incoming
          isGrouped ? 'rounded-[18px]' : 'rounded-[18px] rounded-tl-[5px]',
        ),
    isSending && 'opacity-70',
    isError && '!bg-destructive/20 ring-1 ring-destructive/40',
  );

  return (
    <motion.div
      className={cn(
        'flex items-end gap-2 px-3',
        isGrouped ? 'mt-0.5' : showAvatar ? 'mt-3' : 'mt-0.5',
        isCurrentUser ? 'flex-row-reverse' : 'flex-row',
      )}
      initial={{ opacity: 0, y: 5, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      layout
    >
      {/* ── Avatar column ── */}
      <div
        className={cn(
          'w-8 h-8 shrink-0 self-end rounded-full overflow-hidden',
          isCurrentUser && 'invisible',
        )}
      >
        {showAvatar && !isCurrentUser && (
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          >
            <UserAvatar
              src={message.author.photoURL}
              fallback={(message.author.displayName || 'U').substring(0, 2).toUpperCase()}
              imageHint={message.author.imageHint}
            />
          </motion.div>
        )}
      </div>

      {/* ── Main column ── */}
      <div
        className={cn(
          'flex flex-col max-w-[75%] md:max-w-[65%]',
          isCurrentUser ? 'items-end' : 'items-start',
        )}
      >
        {/* Sender name above bubble (first in a run, others only) */}
        {showAvatar && !isCurrentUser && (
          <p className="text-xs font-semibold text-primary mb-1 px-1">
            {message.author.displayName}
          </p>
        )}

        {/* ── Bubble ── */}
        <div className={bubbleCls}>
          {/* Sentinel tag on error */}
          {isError && message.toxicityReason && (
            <div className="flex items-center gap-1.5 text-xs rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 p-2 m-3 mb-0">
              <ShieldAlert className="w-3 h-3 shrink-0" />
              <span>{message.toxicityReason}</span>
            </div>
          )}

          {/* ── Image ── */}
          {message.mediaUrl && message.mediaType === 'image' && (
            <Dialog>
              <DialogTrigger asChild>
                <motion.div
                  className="overflow-hidden cursor-pointer group/img rounded-xl"
                  style={{ margin: isMediaPlaceholder ? '2px' : '6px 6px 0' }}
                  whileHover={{ scale: 1.005 }}
                >
                  <div
                    className="relative"
                    style={{ aspectRatio: '4/3', minWidth: 180, maxWidth: 280 }}
                  >
                    <Image
                      src={message.mediaUrl}
                      alt="Shared image"
                      fill
                      sizes="280px"
                      className="object-cover"
                      placeholder="blur"
                      blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                      <ZoomIn className="w-7 h-7 text-white drop-shadow" />
                    </div>
                  </div>
                </motion.div>
              </DialogTrigger>
              <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black/95 border border-white/10">
                <div className="flex items-center justify-center p-4 min-h-[200px]">
                  <Image
                    src={message.mediaUrl}
                    alt="Shared image"
                    width={1200}
                    height={800}
                    className="rounded-lg object-contain max-h-[85vh] w-auto h-auto"
                    quality={100}
                    priority
                  />
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* ── Video ── */}
          {message.mediaUrl && message.mediaType === 'video' && (
            <video
              src={message.mediaUrl}
              controls
              className="rounded-xl w-full max-h-56 block"
              style={{ margin: isMediaPlaceholder ? '2px' : '6px 6px 0', maxWidth: 280 }}
              preload="metadata"
            />
          )}

          {/* ── Audio ── */}
          {message.mediaUrl && message.mediaType === 'audio' && (
            <div className="px-3 pt-3 pb-0">
              <audio
                src={message.mediaUrl}
                controls
                className="w-full max-w-xs h-10"
                preload="metadata"
              />
            </div>
          )}

          {/* ── File attachment ── */}
          {message.mediaUrl && message.mediaType === 'file' && (
            <a
              href={message.mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-3 pt-3 pb-0 hover:opacity-80 transition-opacity"
            >
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <span className="text-xl">📎</span>
              </div>
              <span className="text-xs font-medium hover:underline">Download file</span>
            </a>
          )}

          {/* ── Text ── */}
          {!isMediaPlaceholder && (
            <div className="px-3 pt-2.5">
              <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                {message.content}
                {/* Invisible spacer so timestamp never overlaps the last text line */}
                <span className="inline-block opacity-0 ml-1 text-[10px] select-none" aria-hidden>
                  {timeStr}
                  {isCurrentUser && '\u00A0\u00A0\u2713'}
                </span>
              </p>
            </div>
          )}

          {/* ── Timestamp + Read Receipts (always inside bubble, bottom-right) ── */}
          <div
            className={cn(
              'flex items-center justify-end gap-1 px-3 pb-1.5',
              !isMediaPlaceholder ? 'pt-0' : 'pt-1.5',
              isCurrentUser ? 'text-white/65' : 'text-foreground/55',
            )}
          >
            <span className="text-[10px] leading-none tabular-nums font-medium">{timeStr}</span>
            {isCurrentUser && (
              <ReadReceiptIcon status={message.status} readStatus={message.readStatus} />
            )}
          </div>
        </div>

        {/* ── Retry / delete on error ── */}
        {isError && (onRetry || onDelete) && (
          <div className="flex items-center gap-1 mt-1 px-1">
            {onRetry && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                onClick={onRetry}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={onDelete}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}

        {/* ── Reactions ── */}
        <AnimatePresence>
          {message.reactions && message.reactions.length > 0 && (
            <motion.div
              className={cn(
                'flex gap-1 mt-1.5 flex-wrap',
                isCurrentUser ? 'justify-end' : 'justify-start',
              )}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {message.reactions.map((reaction, i) => (
                <motion.div key={i} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    variant={reaction.reacted ? 'secondary' : 'ghost'}
                    size="sm"
                    className="px-2 py-0.5 h-auto rounded-full bg-card/90 border border-border/60 text-xs shadow-sm"
                  >
                    {reaction.emoji}
                    <span className="ml-1 font-semibold">{reaction.count}</span>
                  </Button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default memo(ChatMessage);
