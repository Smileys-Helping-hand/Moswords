import type { Message } from '@/lib/types';
import type { OptimisticMessage } from '@/hooks/use-chat';
import UserAvatar from './user-avatar';
import { Button } from './ui/button';
import { ShieldAlert, MoreVertical, Reply, RefreshCw, X, ZoomIn, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { format, isToday, isYesterday, parseISO, isValid } from 'date-fns';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from './ui/dialog';

interface ChatMessageProps {
  message: OptimisticMessage;
  showAvatar: boolean;
  isGrouped?: boolean;
  isLastInGroup?: boolean;
  onRetry?: () => void;
  onDelete?: () => void;
}

// Helper function to format message timestamp
const formatMessageTimestamp = (timestamp: any): string => {
  try {
    let date: Date | null = null;

    // Handle different timestamp formats
    if (timestamp?.seconds) {
      // Firestore timestamp format
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string') {
      // ISO string format
      date = parseISO(timestamp);
    } else if (typeof timestamp === 'number') {
      // Unix timestamp in milliseconds
      date = new Date(timestamp);
    }

    // Validate the date
    if (!date || !isValid(date)) {
      return 'Just now';
    }

    // Format based on recency
    if (isToday(date)) {
      return `Today at ${format(date, 'h:mm a')}`;
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, yyyy, h:mm a');
    }
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Just now';
  }
};

export default function ChatMessage({ 
  message, 
  showAvatar, 
  isGrouped = false,
  isLastInGroup = true,
  onRetry,
  onDelete,
}: ChatMessageProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Status indicators
  const isSending = message.status === 'sending';
  const isError = message.status === 'error';
  const isFlagged = message.isFlagged || isError;

  if (message.isFlagged && !isError) {
    return (
        <motion.div 
          className={`flex items-start gap-4 group ${showAvatar ? 'mt-4' : 'mt-1'}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
            <div className="w-10 h-10">
                {showAvatar && <UserAvatar src={message.author.photoURL} imageHint={message.author.imageHint} />}
            </div>
            <div className="flex-1">
                {showAvatar && (
                    <div className="flex items-baseline gap-2">
                        <p className="font-semibold text-primary">{message.author.displayName}</p>
                        <p className="text-xs text-muted-foreground">{formatMessageTimestamp(message.timestamp)}</p>
                    </div>
                )}
                <motion.div 
                  className="text-sm text-yellow-200/80 italic flex items-center gap-2 rounded-md bg-yellow-900/30 p-3 border border-yellow-700/50"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                   <ShieldAlert className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                   <div>
                        <span className="font-semibold">A message from the AI Sentinel:</span>
                        <p className="not-italic text-yellow-100/90">{message.toxicityReason}</p>
                   </div>
                </motion.div>
            </div>
        </motion.div>
    )
  }

  return (
    <motion.div 
      className={`flex items-start gap-4 group relative ${showAvatar ? 'mt-4' : 'mt-1'} ${isGrouped ? 'py-0.5' : 'py-2'} px-4 hover:bg-white/5 rounded-lg transition-colors ${isError ? 'bg-red-500/10' : ''} ${isSending ? 'opacity-70' : ''}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="w-10 h-10">
        {showAvatar && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <UserAvatar src={message.author.photoURL} imageHint={message.author.imageHint} />
          </motion.div>
        )}
      </div>
      <div className="flex-1">
        {showAvatar && (
          <div className="flex items-baseline gap-2">
            <p className="font-semibold text-primary hover:underline cursor-pointer">{message.author.displayName}</p>
            <p className="text-xs text-muted-foreground">{formatMessageTimestamp(message.timestamp)}</p>
            {isSending && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            {isError && <span className="text-xs text-red-400 font-medium">Failed to send</span>}
          </div>
        )}
        
        {/* Error message for flagged content */}
        {isError && message.toxicityReason && (
          <motion.div 
            className="text-sm text-yellow-200/80 italic flex items-center gap-2 rounded-md bg-yellow-900/30 p-2 border border-yellow-700/50 mt-1 mb-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <ShieldAlert className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <span className="text-xs">{message.toxicityReason}</span>
          </motion.div>
        )}
        
        {/* Media content */}
        {message.mediaUrl && message.mediaType === 'image' && (
          <Dialog>
            <DialogTrigger asChild>
              <motion.div 
                className="relative mt-2 rounded-lg overflow-hidden cursor-pointer group max-w-md"
                whileHover={{ scale: 1.01 }}
              >
                <div className="relative w-full" style={{ aspectRatio: '4/3' }}>
                  <Image
                    src={message.mediaUrl}
                    alt="Shared image"
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="rounded-lg object-cover"
                    placeholder="blur"
                    blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
                    style={{ objectFit: 'cover' }}
                  />
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                  <ZoomIn className="w-8 h-8 text-white" />
                </div>
              </motion.div>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black/95 border border-white/10 overflow-hidden">
              <div className="relative w-full h-full flex items-center justify-center p-4">
                <div className="relative max-w-full max-h-[85vh]">
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
              </div>
            </DialogContent>
          </Dialog>
        )}
        
        {message.mediaUrl && message.mediaType === 'video' && (
          <div className="mt-2 max-w-md">
            <video
              src={message.mediaUrl}
              controls
              className="rounded-lg w-full max-h-80"
              preload="metadata"
            />
          </div>
        )}
        
        {message.mediaUrl && message.mediaType === 'audio' && (
          <div className="mt-2 max-w-md">
            <audio
              src={message.mediaUrl}
              controls
              className="w-full"
              preload="metadata"
            />
          </div>
        )}
        
        {message.mediaUrl && message.mediaType === 'file' && (
          <a 
            href={message.mediaUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg glass-card hover:bg-white/10 transition-colors"
          >
            <span className="text-2xl">📎</span>
            <span className="text-sm text-primary hover:underline">Download file</span>
          </a>
        )}
        
        {/* Text content - hide placeholder text for media messages */}
        {(!message.mediaUrl || !['📷 Image', '🎬 Video', '🎵 Audio', '📎 File'].includes(message.content)) && (
          <div className="flex items-center gap-2">
            <p className="text-base text-foreground/90">{message.content}</p>
            {isError && (onRetry || onDelete) && (
              <div className="flex items-center gap-1 ml-2">
                {onRetry && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20"
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
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-white/10"
                    onClick={onDelete}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
        
        <AnimatePresence>
          {message.reactions && message.reactions.length > 0 && (
            <motion.div 
              className="flex gap-1 mt-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
                {message.reactions.map((reaction, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button 
                        variant={reaction.reacted ? 'secondary' : 'ghost'} 
                        size="sm" 
                        className="px-2 py-1 h-auto rounded-full glass-card border border-white/10"
                      >
                          {reaction.emoji} <span className="text-xs ml-1 font-semibold">{reaction.count}</span>
                      </Button>
                    </motion.div>
                ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick actions on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="absolute -top-2 right-4 glass-card p-1 rounded-lg shadow-xl border border-white/10 flex gap-1 z-10"
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.15 }}
          >
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 hover:text-primary hover:bg-primary/10"
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Implement reply functionality
                console.log('Reply to:', message.id);
              }}
              title="Reply"
            >
              <Reply className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 hover:text-primary hover:bg-primary/10"
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Show more options menu
                console.log('More options for:', message.id);
              }}
              title="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
