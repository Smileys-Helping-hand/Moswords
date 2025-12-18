"use client";

import { Hash, Mic, Plus, Settings, Headphones, Search } from 'lucide-react';
import { Button } from './ui/button';
import UserAvatar from './user-avatar';
import type { Channel } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useEffect, useState } from 'react';

function ChannelLink({ channel, active }: { channel: Channel; active?: boolean }) {
  return (
    <Button
      variant={active ? 'secondary' : 'ghost'}
      className="w-full justify-start gap-2"
    >
      {channel.type === 'text' ? (
        <Hash className="w-5 h-5 text-muted-foreground" />
      ) : (
        <Mic className="w-5 h-5 text-muted-foreground" />
      )}
      <span className={active ? '' : 'text-muted-foreground'}>{channel.name}</span>
    </Button>
  );
}

export default function ChannelSidebar() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeServer, setActiveServer] = useState<any>(null); // Replace with Server type

  useEffect(() => {
    // For now, let's assume we have a way to get the active server
    // In a real app, this would come from a global state or prop
    const mockActiveServerId = '1'; 

    const channelsQuery = query(
      collection(firestore, 'channels'),
      where('serverId', '==', mockActiveServerId)
    );

    const unsubscribe = onSnapshot(channelsQuery, (snapshot) => {
      const channelsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Channel));
      setChannels(channelsData);
    });

    // Fetch server details separately
    const serverRef = doc(firestore, 'servers', mockActiveServerId);
    const unsubServer = onSnapshot(serverRef, (doc) => {
        if (doc.exists()) {
            setActiveServer({ id: doc.id, ...doc.data() });
        }
    });

    return () => {
      unsubscribe();
      unsubServer();
    };
  }, []);

  const textChannels = channels.filter((c) => c.type === 'text');
  const voiceChannels = channels.filter((c) => c.type === 'voice');

  return (
    <nav className="w-64 flex flex-col bg-neutral-900/60 backdrop-blur-xl border-r border-white/5 z-10">
      <header className="p-4 border-b border-white/5 shadow-md">
        <h2 className="font-bold text-lg">{activeServer?.name || 'Loading...'}</h2>
      </header>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <div className="px-2">
            <Button variant="ghost" className="w-full justify-start text-muted-foreground gap-2">
                <Search className="w-4 h-4" /> Search
            </Button>
        </div>
        
        <div className="space-y-1">
            <div className="flex items-center justify-between px-2 py-1">
                <h3 className="text-xs font-bold uppercase text-muted-foreground">Text Channels</h3>
                <Button variant="ghost" size="icon" className="w-6 h-6">
                    <Plus className="w-4 h-4" />
                </Button>
            </div>
            {textChannels.map((channel, i) => (
                <ChannelLink key={channel.id} channel={channel} active={i === 0} />
            ))}
        </div>

        <div className="space-y-1">
            <div className="flex items-center justify-between px-2 py-1">
                <h3 className="text-xs font-bold uppercase text-muted-foreground">Voice Channels</h3>
                <Button variant="ghost" size="icon" className="w-6 h-6">
                    <Plus className="w-4 h-4" />
                </Button>
            </div>
            {voiceChannels.map((channel) => (
                <ChannelLink key={channel.id} channel={channel} />
            ))}
        </div>
      </div>

      <footer className="p-2 bg-neutral-950/70 backdrop-blur-lg">
        <div className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/50">
            <div className="flex items-center gap-2">
                <UserAvatar src={user?.photoURL ?? ''} />
                <div>
                    <p className="font-semibold text-sm">{user?.displayName}</p>
                    <p className="text-xs text-muted-foreground">Online</p>
                </div>
            </div>
            <div className="flex items-center">
                <Button variant="ghost" size="icon"><Mic className="w-5 h-5" /></Button>
                <Button variant="ghost" size="icon"><Headphones className="w-5 h-5" /></Button>
                <Button variant="ghost" size="icon"><Settings className="w-5 h-5" /></Button>
            </div>
        </div>
      </footer>
    </nav>
  );
}
