'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import UserAvatar from '@/components/user-avatar';
import { Loader2, MessageSquare, ArrowLeft, Users, UserPlus, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import CreateGroupChatDialog from '@/components/create-group-chat-dialog';
import FriendsDialog from '@/components/friends-dialog';
import AddContactDialog from '@/components/add-contact-dialog';

type Conversation = {
  otherUserId: string;
  otherUser?: {
    id: string;
    email: string;
    name: string | null;
    displayName: string | null;
    photoURL: string | null;
    lastSeen: string | null;
  };
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    receiverId: string;
    createdAt: string;
    read: boolean;
    archived: boolean;
  };
  unreadCount: number;
};

type GroupChat = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  memberCount: number;
  userRole: string;
};

export default function DMInboxPage() {
  const { status } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    const load = async () => {
      try {
        const [convRes, groupRes] = await Promise.all([
          fetch('/api/conversations'),
          fetch('/api/group-chats')
        ]);
        
        if (convRes.ok) {
          const convData = await convRes.json();
          setConversations(convData.conversations ?? []);
        }
        
        if (groupRes.ok) {
          const groupData = await groupRes.json();
          setGroupChats(groupData.groupChats ?? []);
        }
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      load();
      const interval = setInterval(load, 5000);
      return () => clearInterval(interval);
    }
  }, [status, router]);

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
        className="glass-panel border-b border-white/10 p-3 shrink-0"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="shrink-0 w-9 h-9">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquare className="w-5 h-5 text-primary shrink-0" />
              <h1 className="font-bold text-lg truncate">Messages</h1>
            </div>
          </div>
        </div>
        
        {/* Action Buttons - More prominent on mobile */}
        <div className="flex gap-2">
          <FriendsDialog />
          <AddContactDialog />
          <CreateGroupChatDialog />
        </div>
      </motion.header>

      <Tabs defaultValue="dms" className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <TabsList className="mx-3 mt-3 shrink-0 grid grid-cols-2 h-11">
          <TabsTrigger value="dms" className="text-sm font-medium">
            <MessageSquare className="w-4 h-4 mr-2" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="groups" className="text-sm font-medium">
            <Users className="w-4 h-4 mr-2" />
            Groups ({groupChats.length})
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 p-3 pb-24 md:pb-4 smooth-scroll">
          <TabsContent value="dms" className="mt-0">
            <div className="max-w-3xl mx-auto space-y-2">
              {conversations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No conversations yet</p>
                  <p className="text-xs mt-1">Add friends and start chatting!</p>
                </div>
              ) : (
                <AnimatePresence>
                  {conversations.map((c, index) => (
                    <motion.button
                      key={c.otherUserId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => router.push(`/dm/${c.otherUserId}`)}
                      className="w-full text-left glass-panel hover:bg-white/5 transition-colors rounded-lg p-4 group"
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          src={c.otherUser?.photoURL || ''}
                          fallback={(c.otherUser?.displayName || c.otherUser?.name || c.otherUser?.email || 'U').substring(0, 2).toUpperCase()}
                          status={c.otherUser?.lastSeen === 'online' ? 'online' : 'offline'}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">
                              {c.otherUser?.displayName || c.otherUser?.name || c.otherUser?.email}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              {new Date(c.lastMessage.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {c.lastMessage.content}
                          </p>
                        </div>
                        {c.unreadCount > 0 && (
                          <div className="bg-primary text-primary-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                            {c.unreadCount}
                          </div>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </TabsContent>

          <TabsContent value="groups" className="mt-0">
            <div className="max-w-3xl mx-auto space-y-2">
              {groupChats.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No group chats yet</p>
                  <p className="text-xs mt-1 mb-4">Create a group to chat with multiple friends!</p>
                  <CreateGroupChatDialog />
                </div>
              ) : (
                <AnimatePresence>
                  {groupChats.map((group, index) => (
                    <motion.button
                      key={group.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => router.push(`/group/${group.id}`)}
                      className="w-full text-left glass-panel hover:bg-white/5 transition-colors rounded-lg p-4 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <Users className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">{group.name}</p>
                            {group.userRole === 'admin' && (
                              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                                Admin
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                          </p>
                          {group.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {group.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
