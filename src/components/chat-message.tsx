import type { Message } from '@/lib/types';
import UserAvatar from './user-avatar';
import { Button } from './ui/button';
import { ShieldAlert, MessageCircleWarning } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ChatMessageProps {
  message: Message;
  showAvatar: boolean;
}

export default function ChatMessage({ message, showAvatar }: ChatMessageProps) {
  if (message.isFlagged) {
    return (
        <div className={`flex items-start gap-4 group ${showAvatar ? 'mt-4' : ''}`}>
            <div className="w-10 h-10">
                {showAvatar && <UserAvatar src={message.author.photoURL} imageHint={message.author.imageHint} />}
            </div>
            <div className="flex-1">
                {showAvatar && (
                    <div className="flex items-baseline gap-2">
                        <p className="font-semibold text-primary">{message.author.displayName}</p>
                        <p className="text-xs text-muted-foreground">{new Date(message.timestamp?.seconds * 1000).toLocaleTimeString()}</p>
                    </div>
                )}
                <div className="text-sm text-yellow-200/80 italic flex items-center gap-2 rounded-md bg-yellow-900/30 p-3 border border-yellow-700/50">
                   <ShieldAlert className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                   <div>
                        <span className="font-semibold">A message from the AI Sentinel:</span>
                        <p className="not-italic text-yellow-100/90">{message.toxicityReason}</p>
                   </div>
                </div>
            </div>
        </div>
    )
  }

  return (
    <div className={`flex items-start gap-4 group ${showAvatar ? 'mt-4' : ''}`}>
      <div className="w-10 h-10">
        {showAvatar && <UserAvatar src={message.author.photoURL} imageHint={message.author.imageHint} />}
      </div>
      <div className="flex-1">
        {showAvatar && (
          <div className="flex items-baseline gap-2">
            <p className="font-semibold text-primary">{message.author.displayName}</p>
            <p className="text-xs text-muted-foreground">{new Date(message.timestamp?.seconds * 1000).toLocaleTimeString()}</p>
          </div>
        )}
        <p className="text-base text-foreground/90">{message.content}</p>
        <div className="flex gap-1 mt-1">
            {message.reactions.map((reaction, i) => (
                <Button key={i} variant={reaction.reacted ? 'secondary' : 'ghost'} size="sm" className="px-2 py-1 h-auto rounded-full transition-transform hover:scale-110 active:scale-95">
                    {reaction.emoji} <span className="text-xs ml-1 font-semibold">{reaction.count}</span>
                </Button>
            ))}
        </div>
      </div>
    </div>
  );
}
