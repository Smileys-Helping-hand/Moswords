"use client";

import { Hash, Mic, Settings, Headphones, Search, Volume2, Crown, Users } from 'lucide-react';
import { Button } from './ui/button';
import UserAvatar from './user-avatar';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import CreateChannelDialog from './create-channel-dialog';
import AddContactDialog from './add-contact-dialog';
import FriendsDialog from './friends-dialog';

interface Channel {
  id: string;
  name: string;
  type: string;
  serverId: string;
  createdAt: Date;
}

interface Server {
  id: string;
  name: string;
  imageUrl: string | null;
}

function ChannelLink({ channel, active }: { channel: Channel; active?: boolean }) {
  return (
    <motion.div
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
    >
      <Button
        variant={active ? 'secondary' : 'ghost'}
        className={`w-full justify-start gap-2 ${active ? 'bg-white/10 text-white' : 'hover:bg-white/5'}`}
      >
        {channel.type === 'text' ? (
          <Hash className="w-5 h-5 text-muted-foreground" />
        ) : (
          <Volume2 className="w-5 h-5 text-muted-foreground" />
        )}
        <span className={active ? 'font-semibold' : 'text-muted-foreground'}>{channel.name}</span>
      </Button>
    </motion.div>
  );
}

export default function ChannelSidebar() {
  const { session } = useAuth();
  const user = session?.user;
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeServer, setActiveServer] = useState<Server | null>(null);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const { toast } = useToast();

  // Get the first server as active (in a real app, this would be from state/context)
  useEffect(() => {
    const fetchServers = async () => {
      try {
        const response = await fetch('/api/servers');
        if (!response.ok) throw new Error('Failed to fetch servers');
        const data = await response.json();
        if (data.servers.length > 0) {
          const firstServer = data.servers[0].server;
          setActiveServerId(firstServer.id);
          setActiveServer(firstServer);
        }
      } catch (error) {
        console.error("Failed to fetch servers:", error);
      }
    };
    fetchServers();
  }, []);

  useEffect(() => {
    if (!activeServerId) return;

    const fetchChannels = async () => {
      try {
        const response = await fetch(`/api/servers/${activeServerId}/channels`);
        if (!response.ok) throw new Error('Failed to fetch channels');
        const data = await response.json();
        setChannels(data.channels);
      } catch (error) {
        console.error("Failed to fetch channels:", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load channels',
        });
      }
    };

    fetchChannels();
    const interval = setInterval(fetchChannels, 30000);
    return () => clearInterval(interval);
  }, [activeServerId, toast]);

  const handleChannelCreated = () => {
    // Refetch channels immediately when a new one is created
    if (!activeServerId) return;
    const fetchChannels = async () => {
      try {
        const response = await fetch(`/api/servers/${activeServerId}/channels`);
        if (!response.ok) throw new Error('Failed to fetch channels');
        const data = await response.json();
        setChannels(data.channels);
      } catch (error) {
        console.error("Failed to fetch channels:", error);
      }
    };
    fetchChannels();
  };

  const textChannels = channels.filter((c) => c.type === 'text');
  const voiceChannels = channels.filter((c) => c.type === 'voice');

  return (
    <nav className="w-64 flex flex-col glass-panel border-r border-white/5 z-10">
      <motion.header 
        className="p-4 border-b border-white/10 shadow-lg"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-gradient">{activeServer?.name || 'No Server'}</h2>
          {activeServer && <Crown className="w-5 h-5 text-accent" />}
        </div>
      </motion.header>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <motion.div 
          className="px-2 space-y-2"
          whileHover={{ scale: 1.02 }}
        >
            <Button variant="ghost" className="w-full justify-start text-muted-foreground gap-2 glass-card">
                <Search className="w-4 h-4" /> 
                <span className="text-sm">Search</span>
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-muted-foreground gap-2 glass-card hover:bg-primary/10 hover:text-primary"
              onClick={() => router.push('/dm')}
            >
                <Users className="w-4 h-4" /> 
                <span className="text-sm">Friends & DMs</span>
            </Button>
            <AddContactDialog />
        </motion.div>
        
        <div className="space-y-1">
            <div className="flex items-center justify-between px-2 py-2">
                <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Text Channels</h3>
                <motion.div whileHover={{ rotate: 90 }} whileTap={{ scale: 0.9 }}>
                  <CreateChannelDialog serverId={activeServerId || undefined} onChannelCreated={handleChannelCreated} />
                </motion.div>
            </div>
            <AnimatePresence>
              {textChannels.map((channel, i) => (
                  <motion.div
                    key={channel.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <ChannelLink channel={channel} active={i === 0} />
                  </motion.div>
              ))}
            </AnimatePresence>
        </div>

        <div className="space-y-1">
            <div className="flex items-center justify-between px-2 py-2">
                <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Voice Channels</h3>
                <motion.div whileHover={{ rotate: 90 }} whileTap={{ scale: 0.9 }}>
                  <CreateChannelDialog serverId={activeServerId || undefined} onChannelCreated={handleChannelCreated} />
                </motion.div>
            </div>
            <AnimatePresence>
              {voiceChannels.map((channel, i) => (
                  <motion.div
                    key={channel.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <ChannelLink channel={channel} />
                  </motion.div>
              ))}
            </AnimatePresence>
        </div>
      </div>

      <motion.footer 
        className="p-2 glass-panel border-t border-white/10"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div 
          className="flex items-center justify-between p-2 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
          whileHover={{ scale: 1.02 }}
        >
            <div className="flex items-center gap-2">
                <div className="relative">
                  <UserAvatar src={user?.image ?? ''} />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></span>
                </div>
                <div>
                    <p className="font-semibold text-sm">{user?.name ?? 'User'}</p>
                    <p className="text-xs text-green-400">● Online</p>
                </div>
            </div>
            <div className="flex items-center">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button variant="ghost" size="icon" className="hover:text-primary hover:bg-white/10">
                    <Mic className="w-5 h-5" />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button variant="ghost" size="icon" className="hover:text-primary hover:bg-white/10">
                    <Headphones className="w-5 h-5" />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="hover:text-primary hover:bg-white/10"
                    onClick={() => window.location.href = '/profile'}
                  >
                    <Settings className="w-5 h-5" />
                  </Button>
                </motion.div>
            </div>
        </motion.div>
      </motion.footer>
    </nav>
  );
}

    