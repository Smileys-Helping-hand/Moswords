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
                {showAvatar && <UserAvatar src={message.author.avatarUrl} imageHint={message.author.imageHint} />}
            </div>
            <div className="flex-1">
                {showAvatar && (
                    <div className="flex items-baseline gap-2">
                        <p className="font-semibold text-primary">{message.author.name}</p>
                        <p className="text-xs text-muted-foreground">{message.timestamp}</p>
                    </div>
                )}
                <div className="text-sm text-muted-foreground/80 italic flex items-center gap-2 rounded-md bg-muted/30 p-2">
                   <ShieldAlert className="w-4 h-4 text-yellow-500" />
                   <span>This message was flagged by our AI moderator.</span>
                    <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger>
                                <MessageCircleWarning className="w-4 h-4 cursor-help hover:text-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="max-w-xs text-sm">{message.toxicityReason}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
        </div>
    )
  }

  return (
    <div className={`flex items-start gap-4 group ${showAvatar ? 'mt-4' : ''}`}>
      <div className="w-10 h-10">
        {showAvatar && <UserAvatar src={message.author.avatarUrl} imageHint={message.author.imageHint} />}
      </div>
      <div className="flex-1">
        {showAvatar && (
          <div className="flex items-baseline gap-2">
            <p className="font-semibold text-primary">{message.author.name}</p>
            <p className="text-xs text-muted-foreground">{message.timestamp}</p>
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
