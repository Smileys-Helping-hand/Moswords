'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Server, Plus, Hash, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import CreateServerDialog from './create-server-dialog';
import { useToast } from '@/hooks/use-toast';
import { MoswordsIcon } from './icons';

interface ServerData {
  id: string;
  name: string;
  imageUrl: string | null;
  ownerId: string;
}

interface Channel {
  id: string;
  name: string;
  type: string;
}

export default function MobileServerPicker() {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [servers, setServers] = useState<ServerData[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedServer, setSelectedServer] = useState<ServerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingChannels, setLoadingChannels] = useState(false);

  // Extract current serverId from pathname
  const currentServerId = pathname?.match(/\/servers\/([^\/]+)/)?.[1];

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const response = await fetch('/api/servers');
        if (!response.ok) throw new Error('Failed to fetch servers');
        const data = await response.json();
        const serverList = data.servers.map((item: any) => item.server);
        setServers(serverList);
        
        // If we're on a server page, select that server
        if (currentServerId) {
          const found = serverList.find((s: ServerData) => s.id === currentServerId);
          if (found) {
            setSelectedServer(found);
            fetchChannels(found.id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch servers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServers();
  }, [currentServerId]);

  const fetchChannels = async (serverId: string) => {
    setLoadingChannels(true);
    try {
      const response = await fetch(`/api/servers/${serverId}/channels`);
      if (!response.ok) throw new Error('Failed to fetch channels');
      const data = await response.json();
      setChannels(data.channels || []);
    } catch (error) {
      console.error('Failed to fetch channels:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load channels',
      });
    } finally {
      setLoadingChannels(false);
    }
  };

  const handleServerSelect = (server: ServerData) => {
    setSelectedServer(server);
    fetchChannels(server.id);
  };

  const handleChannelSelect = (channel: Channel) => {
    if (selectedServer) {
      router.push(`/servers/${selectedServer.id}/channels/${channel.id}`);
      setOpen(false);
    }
  };

  const handleBackToServers = () => {
    setSelectedServer(null);
    setChannels([]);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden fixed top-3 left-3 z-30 w-10 h-10 rounded-xl glass-panel border border-white/10"
        >
          <Server className="w-5 h-5 text-primary" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0 glass-panel border-r border-white/10">
        <SheetHeader className="p-4 border-b border-white/10">
          <SheetTitle className="flex items-center gap-2">
            <MoswordsIcon className="w-6 h-6" />
            {selectedServer ? selectedServer.name : 'Your Servers'}
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-80px)]">
          <AnimatePresence mode="wait">
            {!selectedServer ? (
              // Server List View
              <motion.div
                key="servers"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-3 space-y-2"
              >
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : servers.length === 0 ? (
                  <div className="text-center py-8">
                    <Server className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground text-sm">No servers yet</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">Create or join a server to get started</p>
                    <CreateServerDialog />
                  </div>
                ) : (
                  <>
                    {servers.map((server, index) => (
                      <motion.button
                        key={server.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleServerSelect(server)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/10 ${
                          currentServerId === server.id ? 'bg-white/10 border border-primary/50' : ''
                        }`}
                      >
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                          {server.imageUrl ? (
                            <Image
                              src={server.imageUrl}
                              alt={server.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg font-bold text-primary">
                              {server.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="font-semibold truncate">{server.name}</p>
                          <p className="text-xs text-muted-foreground">Tap to view channels</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </motion.button>
                    ))}
                    
                    <div className="pt-4">
                      <CreateServerDialog />
                    </div>
                  </>
                )}
              </motion.div>
            ) : (
              // Channel List View
              <motion.div
                key="channels"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-3"
              >
                <button
                  onClick={handleBackToServers}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Back to servers
                </button>
                
                {loadingChannels ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : channels.length === 0 ? (
                  <div className="text-center py-8">
                    <Hash className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground text-sm">No channels yet</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Text Channels
                    </p>
                    {channels.map((channel, index) => (
                      <motion.button
                        key={channel.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => handleChannelSelect(channel)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                      >
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        <span className="truncate">{channel.name}</span>
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
