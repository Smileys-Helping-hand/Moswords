"use client"

import { Hash, Pin, Users, Sparkles, Video, Phone, Server } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { motion } from 'framer-motion';
import KeyboardShortcutsDialog from './keyboard-shortcuts-dialog';
import NotificationsPopover from './notifications-popover';
import InviteMemberModal from './invite-member-modal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useState, useEffect } from 'react';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePathname, useRouter } from 'next/navigation';
import MemberSidebar from './member-sidebar';
import UserAvatar from './user-avatar';

interface Channel {
  id: string;
  name: string;
  type: string;
  serverId: string;
}

function ThreadSummary() {
    const pathname = usePathname();
    const [summary, setSummary] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        // Extract channelId from URL
        const channelMatch = pathname?.match(/\/channels\/([^\/]+)/);
        if (channelMatch) {
          setActiveChannelId(channelMatch[1]);
        }
    }, [pathname]);

    const handleSummarize = async () => {
        if (!activeChannelId) return;
        
        setLoading(true);
        setSummary(null);
        try {
            const response = await fetch(`/api/channels/${activeChannelId}/messages`);
            if (!response.ok) throw new Error('Failed to fetch messages');
            const data = await response.json();
            
            const messageTexts = data.messages.map((m: any) => 
                `${m.user.displayName || m.user.name}: ${m.message.content}`
            );
            
            const aiRes = await fetch('/api/ai/summarize-thread', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                channelId: activeChannelId,
                threadId: activeChannelId,
                messages: messageTexts,
              }),
            });

            if (!aiRes.ok) throw new Error('Failed to summarize');
            const aiData = await aiRes.json();
            setSummary(aiData.summary);
        } catch (error) {
            console.error("Failed to summarize thread:", error);
            setSummary("Sorry, I couldn't generate a summary for this thread.");
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to generate summary',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog onOpenChange={(open) => !open && setSummary(null)}>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="hover:text-primary hover:bg-white/10">
                          <Sparkles className="w-5 h-5 text-primary" />
                      </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>AI Summarize Thread</p>
                </TooltipContent>
              </Tooltip>
            </motion.div>
            <DialogContent onOpenAutoFocus={handleSummarize} className="glass-card border-white/20 sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-gradient flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      AI Thread Summary
                    </DialogTitle>
                    <DialogDescription>
                        Powered by Gemini 1.5 Flash
                    </DialogDescription>
                </DialogHeader>
                <div className="prose prose-sm dark:prose-invert">
                    {loading && (
                        <motion.div 
                          className="space-y-3 py-4"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                            <div className="flex items-center gap-2 text-primary">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              >
                                <Sparkles className="w-5 h-5" />
                              </motion.div>
                              <span className="text-sm">AI is analyzing messages...</span>
                            </div>
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-4/5" />
                        </motion.div>
                    )}
                    {summary && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="glass-card p-4 rounded-lg"
                        >
                          <ul className="space-y-2">
                              {summary.split('- ').filter(s => s.trim()).map((s, i) => (
                                  <motion.li 
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="text-foreground"
                                  >
                                    {s.trim()}
                                  </motion.li>
                              ))}
                          </ul>
                        </motion.div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}


export default function ChatHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [serverId, setServerId] = useState<string | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);

  useEffect(() => {
    // Extract serverId and channelId from URL: /servers/[serverId]/channels/[channelId]
    const serverMatch = pathname?.match(/\/servers\/([^\/]+)/);
    const channelMatch = pathname?.match(/\/channels\/([^\/]+)/);
    
    if (serverMatch) {
      setServerId(serverMatch[1]);
    }
    
    if (channelMatch) {
      setChannelId(channelMatch[1]);
    }
  }, [pathname]);

  useEffect(() => {
    if (!serverId || !channelId) return;

    const fetchChannelDetails = async () => {
      try {
        const channelsResponse = await fetch(`/api/servers/${serverId}/channels`);
        if (!channelsResponse.ok) return;
        const channelsData = await channelsResponse.json();
        
        const channel = channelsData.channels.find((ch: Channel) => ch.id === channelId);
        if (channel) {
          setCurrentChannel(channel);
        }
      } catch (error) {
        console.error("Failed to fetch channel:", error);
      }
    };
    
    fetchChannelDetails();
  }, [serverId, channelId]);


  return (
    <motion.header 
      className="flex items-center h-12 md:h-14 px-2 md:px-4 border-b border-white/10 shadow-lg glass-panel z-10"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="flex items-center gap-1 md:gap-2 min-w-0">
        <Hash className="w-5 h-5 md:w-6 md:h-6 text-primary shrink-0" />
        <h2 className="font-bold text-sm md:text-lg truncate">{currentChannel?.name || 'Select a channel'}</h2>
        <span className="hidden md:inline text-xs text-muted-foreground px-2 py-1 rounded-full glass-card">
          {Math.floor(Math.random() * 50) + 10} online
        </span>
      </div>

      <div className="flex-1" />

      <TooltipProvider>
        <div className="flex items-center gap-0.5 md:gap-1">
            <ThreadSummary />
          
          {/* Invite Members Button - Only show if on a server (hidden on mobile) */}
          {serverId && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="hidden md:block">
              <InviteMemberModal serverId={serverId} />
            </motion.div>
          )}

          {/* Search - Hidden on mobile */}
          <div className="hidden lg:block w-64">
            <Input
              placeholder={`Search in #${currentChannel?.name || 'channel'}`}
              className="glass-card border-white/20 h-9 focus:border-primary transition-all"
            />
          </div>
          
          {/* Video call button */}
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:text-primary hover:bg-white/10"
                  onClick={() => {
                    if (!serverId || !channelId) return;
                    const url = `/call?serverId=${serverId}&channelId=${channelId}&type=video`;
                    router.push(url);
                  }}
                >
                  <Video className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Start Video Call</p>
              </TooltipContent>
            </Tooltip>
          </motion.div>
          
          {/* Voice call button */}
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:text-primary hover:bg-white/10"
                  onClick={() => {
                    if (!serverId || !channelId) return;
                    const url = `/call?serverId=${serverId}&channelId=${channelId}&type=voice`;
                    router.push(url);
                  }}
                >
                  <Phone className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Start Voice Call</p>
              </TooltipContent>
            </Tooltip>
          </motion.div>
          
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <NotificationsPopover />
          </motion.div>
          
          <KeyboardShortcutsDialog />
          
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:text-primary hover:bg-white/10">
                  <Pin className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Pinned Messages</p>
              </TooltipContent>
            </Tooltip>
          </motion.div>
          
          {/* Member List - Sheet on mobile, tooltip on desktop */}
          <Sheet>
            <SheetTrigger asChild>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button variant="ghost" size="icon" className="hover:text-primary hover:bg-white/10">
                  <Users className="w-5 h-5" />
                </Button>
              </motion.div>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0 glass-panel border-l border-white/10">
              <SheetHeader className="p-4 border-b border-white/10">
                <SheetTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Members
                </SheetTitle>
                <SheetDescription>
                  Server members and their status
                </SheetDescription>
              </SheetHeader>
              <div className="h-[calc(100vh-100px)] overflow-y-auto">
                <MemberSidebar />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </TooltipProvider>
    </motion.header>
  );
}