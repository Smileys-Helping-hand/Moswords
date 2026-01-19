"use client";

import Image from 'next/image';
import { Compass } from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { MoswordsIcon } from './icons';
import { useEffect, useState } from 'react';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import CreateServerDialog from './create-server-dialog';
import { useRouter } from 'next/navigation';

interface Server {
  id: string;
  name: string;
  imageUrl: string | null;
  ownerId: string;
  createdAt: Date;
}

export default function ServerSidebar() {
  const router = useRouter();
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // This would be dynamic based on user's current server
  const activeServerId = servers[0]?.id;

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const response = await fetch('/api/servers');
        if (!response.ok) throw new Error('Failed to fetch servers');
        const data = await response.json();
        setServers(data.servers.map((item: any) => item.server));
      } catch (error) {
        console.error("Failed to fetch servers:", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load servers',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchServers();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchServers, 30000);
    return () => clearInterval(interval);
  }, [toast]);

  const handleServerCreated = () => {
    // Refetch servers immediately when a new one is created
    const fetchServers = async () => {
      try {
        const response = await fetch('/api/servers');
        if (!response.ok) throw new Error('Failed to fetch servers');
        const data = await response.json();
        setServers(data.servers.map((item: any) => item.server));
      } catch (error) {
        console.error("Failed to fetch servers:", error);
      }
    };
    fetchServers();
  };

  if (loading) {
      return (
        <nav className="w-20 bg-neutral-950/80 backdrop-blur-2xl flex flex-col items-center py-3 gap-3 z-20">
            <Skeleton className="w-12 h-12 rounded-2xl" />
            <Separator className="w-8 bg-border/20" />
            <div className="flex flex-col gap-2 items-center">
                <Skeleton className="w-12 h-12 rounded-full" />
                <Skeleton className="w-12 h-12 rounded-full" />
                <Skeleton className="w-12 h-12 rounded-full" />
            </div>
             <Skeleton className="w-12 h-12 rounded-full" />
             <Skeleton className="w-12 h-12 rounded-full" />
        </nav>
      )
  }

  return (
    <nav className="w-20 glass-panel flex flex-col items-center py-3 gap-3 z-20 border-r border-white/5">
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/dm')}
                className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent hover:from-accent hover:to-primary transition-all duration-300 shadow-lg shadow-primary/20"
              >
                <MoswordsIcon className="w-8 h-8 text-white" />
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Direct Messages</p>
          </TooltipContent>
        </Tooltip>

        <Separator className="w-8 bg-white/10" />

        <div className="flex flex-col gap-2 items-center">
          {servers.map((server, index) => (
            <Tooltip key={server.id}>
              <TooltipTrigger asChild>
                <motion.div 
                  className="relative group"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <motion.div
                    className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 bg-white rounded-r-full"
                    initial={{ height: 0 }}
                    animate={{ 
                      height: activeServerId === server.id ? '2.5rem' : '0'
                    }}
                    transition={{ duration: 0.2 }}
                  />
                  <motion.div
                    className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 bg-white/50 rounded-r-full"
                    initial={{ height: 0 }}
                    whileHover={{ height: activeServerId === server.id ? 0 : '1.25rem' }}
                    transition={{ duration: 0.2 }}
                  />

                  <motion.div
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="w-12 h-12 rounded-2xl overflow-hidden p-0 hover:bg-transparent"
                    >
                      <motion.div
                        className="w-full h-full"
                        animate={{ 
                          borderRadius: activeServerId === server.id ? '16px' : '50%'
                        }}
                        whileHover={{ borderRadius: '16px' }}
                        transition={{ duration: 0.3 }}
                      >
                        <Image
                          src={server.imageUrl || '/default-server.png'}
                          alt={server.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      </motion.div>
                    </Button>
                  </motion.div>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{server.name}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <CreateServerDialog onServerCreated={handleServerCreated} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Add a Server</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-12 h-12 rounded-full glass-card hover:bg-green-500/20 text-green-400 hover:text-green-300 transition-all duration-300 border border-green-500/20"
              >
                <Compass />
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Explore Servers</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </nav>
  );
}

    