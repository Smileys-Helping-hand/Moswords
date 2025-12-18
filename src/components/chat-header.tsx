"use client"

import { Bell, Hash, Pin, Users, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { mockChannels } from '@/lib/placeholder-data';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useState } from 'react';
import { summarizeThread } from '@/ai/flows/ai-summarize-thread';
import { mockMessages } from '@/lib/placeholder-data';
import { Skeleton } from './ui/skeleton';

function ThreadSummary() {
    const [summary, setSummary] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSummarize = async () => {
        setLoading(true);
        setSummary(null);
        try {
            const result = await summarizeThread({
                channelId: '1',
                threadId: '1',
                messages: mockMessages.map(m => `${m.author.name}: ${m.content}`),
            });
            setSummary(result.summary);
        } catch (error) {
            console.error("Failed to summarize thread:", error);
            setSummary("Sorry, I couldn't generate a summary for this thread.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog onOpenChange={(open) => !open && setSummary(null)}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Sparkles className="w-5 h-5 text-primary" />
                    </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Summarize Thread</p>
              </TooltipContent>
            </Tooltip>
            <DialogContent onOpenAutoFocus={handleSummarize}>
                <DialogHeader>
                    <DialogTitle>Thread Summary</DialogTitle>
                    <DialogDescription>
                        Here's a quick summary of the conversation.
                    </DialogDescription>
                </DialogHeader>
                <div className="prose prose-sm dark:prose-invert">
                    {loading && (
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-4/5" />
                        </div>
                    )}
                    {summary && (
                        <ul>
                            {summary.split('- ').filter(s => s.trim()).map((s, i) => (
                                <li key={i}>{s.trim()}</li>
                            ))}
                        </ul>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}


export default function ChatHeader() {
  const currentChannel = mockChannels[0];

  return (
    <header className="flex items-center h-14 px-4 border-b border-white/5 shadow-md bg-neutral-900/60 backdrop-blur-xl z-10">
      <div className="flex items-center gap-2">
        <Hash className="w-6 h-6 text-muted-foreground" />
        <h2 className="font-semibold text-lg">{currentChannel.name}</h2>
      </div>

      <div className="flex-1" />

      <TooltipProvider>
        <div className="flex items-center gap-2">
            <ThreadSummary />
          
          <div className="w-64">
            <Input
              placeholder={`Search in #${currentChannel.name}`}
              className="bg-neutral-900/50 border-none h-9"
            />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Bell className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Notification Settings</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Pin className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Pinned Messages</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Users className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Member List</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </header>
  );
}
