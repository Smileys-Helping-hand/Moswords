'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Loader2, Server, ArrowLeft, Plus, Users, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import CreateServerDialog from '@/components/create-server-dialog';
import { useToast } from '@/hooks/use-toast';

interface ServerData {
  id: string;
  name: string;
  imageUrl: string | null;
  ownerId: string;
  createdAt: Date;
  memberCount?: number;
}

export default function ServersPage() {
  const { status } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [servers, setServers] = useState<ServerData[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    const fetchServers = async () => {
      try {
        const response = await fetch('/api/servers');
        if (!response.ok) throw new Error('Failed to fetch servers');
        const data = await response.json();
        setServers(data.servers.map((item: any) => item.server));
      } catch (error) {
        console.error('Failed to fetch servers:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load servers',
        });
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchServers();
    }
  }, [status, router, toast]);

  const handleServerClick = async (serverId: string) => {
    try {
      const response = await fetch(`/api/servers/${serverId}/channels`);
      if (!response.ok) throw new Error('Failed to fetch channels');
      const data = await response.json();
      
      const generalChannel = data.channels.find((ch: any) => ch.name === 'general') || data.channels[0];
      
      if (generalChannel) {
        router.push(`/servers/${serverId}/channels/${generalChannel.id}`);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No channels found in this server',
        });
      }
    } catch (error) {
      console.error('Error navigating to server:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to open server',
      });
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-gradient-to-br from-background via-background to-primary/5 overflow-x-hidden">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-panel border-b border-white/10 px-4 py-3 shrink-0"
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="shrink-0 w-9 h-9">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Server className="w-5 h-5 text-primary shrink-0" />
          <h1 className="font-bold text-lg flex-1 truncate">Your Servers</h1>
          <CreateServerDialog />
        </div>
      </motion.header>

      <ScrollArea className="flex-1 p-4 pb-24 md:pb-4">
        <div className="max-w-3xl mx-auto">
          {servers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <Server className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-xl font-semibold mb-2">No servers yet</h2>
              <p className="text-muted-foreground mb-6">Create a server to start collaborating with your team</p>
              <CreateServerDialog />
            </motion.div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <AnimatePresence>
                {servers.map((server, index) => (
                  <motion.button
                    key={server.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleServerClick(server.id)}
                    className="w-full text-left glass-panel hover:bg-white/5 transition-all rounded-xl p-4 group border border-white/10 hover:border-primary/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 flex-shrink-0">
                        {server.imageUrl ? (
                          <Image
                            src={server.imageUrl}
                            alt={server.name}
                            width={56}
                            height={56}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl font-bold text-primary">
                            {server.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                          {server.name}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            Members
                          </span>
                          <span className="flex items-center gap-1">
                            <Hash className="w-4 h-4" />
                            Channels
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
