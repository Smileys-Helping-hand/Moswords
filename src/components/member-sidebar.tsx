"use client";

import UserAvatar from './user-avatar';
import { Crown, Shield, Star, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Member {
  membership: {
    id: string;
    serverId: string;
    userId: string;
    role: string;
    joinedAt: Date;
  };
  user: {
    id: string;
    name: string | null;
    displayName: string | null;
    email: string | null;
    image: string | null;
    photoURL: string | null;
    customStatus: string | null;
    lastSeen: string | null;
  };
}

function MemberRow({ member }: { member: Member }) {
  const statusColor = {
    online: 'bg-green-500',
    idle: 'bg-yellow-500',
    offline: 'bg-gray-500',
  };

  const status = member.user.lastSeen === 'online' ? 'online' : 'offline';
  
  const getRoleIcon = () => {
    switch (member.membership.role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />;
      case 'moderator':
        return <Star className="w-4 h-4 text-purple-500" />;
      default:
        return null;
    }
  };

  return (
    <motion.div 
      className="flex items-center gap-3 p-2 rounded-md hover:bg-white/5 cursor-pointer transition-colors group"
      whileHover={{ x: 4, scale: 1.02 }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="relative">
        <UserAvatar 
          src={member.user.photoURL || member.user.image || ''} 
          status={status} 
        />
        <motion.div
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${statusColor[status]}`}
          animate={status === 'online' ? { 
            scale: [1, 1.2, 1],
            opacity: [1, 0.8, 1]
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm truncate ${status === 'offline' ? 'text-muted-foreground' : ''}`}>
          {member.user.displayName || member.user.name || 'Unknown'}
        </p>
        {member.user.customStatus && (
          <p className="text-xs text-muted-foreground truncate">{member.user.customStatus}</p>
        )}
      </div>
      {getRoleIcon()}
      <motion.div
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        initial={{ scale: 0 }}
        whileHover={{ scale: 1 }}
      >
        <Zap className="w-3 h-3 text-primary" />
      </motion.div>
    </motion.div>
  );
}

export default function MemberSidebar() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const response = await fetch('/api/servers');
        if (!response.ok) return;
        const data = await response.json();
        if (data.servers.length > 0) {
          setActiveServerId(data.servers[0].server.id);
        }
      } catch (error) {
        console.error("Failed to fetch servers:", error);
      }
    };
    fetchServers();
  }, []);

  useEffect(() => {
    if (!activeServerId) {
      setLoading(false);
      return;
    }

    const fetchMembers = async () => {
      try {
        const response = await fetch(`/api/servers/${activeServerId}/members`);
        if (!response.ok) throw new Error('Failed to fetch members');
        const data = await response.json();
        setMembers(data.members);
      } catch (error) {
        console.error("Failed to fetch members:", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load members',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
    const interval = setInterval(fetchMembers, 5000);
    return () => clearInterval(interval);
  }, [activeServerId, toast]);

    const admins = members.filter(m => m.membership.role === 'admin' || m.membership.role === 'owner');
    const moderators = members.filter(m => m.membership.role === 'moderator');
    const regularMembers = members.filter(m => m.membership.role === 'member');
    const onlineMembers = regularMembers.filter(m => m.user.lastSeen === 'online');
    const offlineMembers = regularMembers.filter(m => m.user.lastSeen !== 'online');

  if (loading) {
    return (
        <aside className="w-64 flex-shrink-0 bg-neutral-900/60 backdrop-blur-xl p-3 space-y-4 overflow-y-auto">
            {[...Array(3)].map((_, i) => (
                <div key={i}>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <div className="space-y-2">
                        {[...Array(2)].map((_, j) => (
                            <div key={j} className="flex items-center gap-3 p-2">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <Skeleton className="h-5 w-32" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </aside>
    )
  }

  return (
    <motion.aside 
      className="w-64 flex-shrink-0 glass-panel border-l border-white/5 p-3 space-y-4 overflow-y-auto"
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
    >
      <AnimatePresence>
        {admins.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2 mb-2 flex items-center gap-2">
              <Shield className="w-3 h-3" />
              Admins — {admins.length}
            </h3>
            <div className="space-y-1">
                {admins.map((member, i) => (
                  <motion.div 
                    key={member.user.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <MemberRow member={member} />
                  </motion.div>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {moderators.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2 mb-2 flex items-center gap-2">
              <Star className="w-3 h-3" />
              Moderators — {moderators.length}
            </h3>
            <div className="space-y-1">
                {moderators.map((member, i) => (
                  <motion.div 
                    key={member.user.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <MemberRow member={member} />
                  </motion.div>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
      >
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2 mb-2 flex items-center gap-2">
          <motion.span
            className="inline-block w-2 h-2 bg-green-500 rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          Online — {onlineMembers.length}
        </h3>
        <div className="space-y-1">
            {onlineMembers.map((member, i) => (
              <motion.div 
                key={member.user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <MemberRow member={member} />
              </motion.div>
            ))}
        </div>
      </motion.div>
      
      <AnimatePresence>
        {offlineMembers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2 mb-2 flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-gray-500 rounded-full" />
              Offline — {offlineMembers.length}
            </h3>
            <div className="space-y-1">
                {offlineMembers.map((member, i) => (
                  <motion.div 
                    key={member.user.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <MemberRow member={member} />
                  </motion.div>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}

    