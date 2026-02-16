'use client';

import { useEffect, useState, useRef, use, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
// Use native scrolling for better mobile behavior
import UserAvatar from '@/components/user-avatar';
import ChatMessage from '@/components/chat-message';
import ChatInput from '@/components/chat/ChatInput';
import { Send, ArrowLeft, Users, Settings, Loader2, Phone, Video, ArrowDown } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  decryptFile,
  decryptMessage,
  encryptFile,
  encryptMessage,
  ensureConversationKey,
} from '@/lib/crypto/e2e-client';

interface Message {
  id: string;
  content: string;
  contentNonce?: string | null;
  isEncrypted?: boolean | null;
  userId: string;
  groupChatId: string;
  createdAt: Date;
  deleted: boolean;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaEncrypted?: boolean | null;
  mediaNonce?: string | null;
  sender?: {
    id: string;
    email: string;
    name: string | null;
    displayName: string | null;
    photoURL: string | null;
  };
}

interface GroupChat {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  createdBy: string;
  createdAt: Date;
}

interface Member {
  id: string;
  userId: string;
  role: string;
  joinedAt: Date;
  user?: {
    id: string;
    email: string;
    name: string | null;
    displayName: string | null;
    photoURL: string | null;
    lastSeen: string | null;
  };
}

export default function GroupChatPage({ params }: { params: Promise<{ groupChatId: string }> }) {
  const { groupChatId } = use(params);
  const { status } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [groupChat, setGroupChat] = useState<GroupChat | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [userRole, setUserRole] = useState<string>('member');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [availableFriends, setAvailableFriends] = useState<any[]>([]);
  const [addingMember, setAddingMember] = useState(false);
  const previousMessageCount = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaUrlsRef = useRef<string[]>([]);
  const memberIdsRef = useRef<string[]>([]);

  const fetchMemberIds = useCallback(async () => {
    if (memberIdsRef.current.length > 0) return memberIdsRef.current;
    const response = await fetch(`/api/group-chats/${groupChatId}/members`);
    if (!response.ok) return [];
    const data = await response.json();
    const ids = (data.members || []).map((member: any) => member.userId || member.id);
    memberIdsRef.current = ids;
    return ids;
  }, [groupChatId]);

  const revokeMediaUrls = useCallback(() => {
    for (const url of mediaUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    mediaUrlsRef.current = [];
  }, []);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  const checkIfAtBottom = useCallback(() => {
    if (!containerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const threshold = 150;
    return scrollHeight - scrollTop - clientHeight < threshold;
  }, []);

  const handleScroll = useCallback(() => {
    const atBottom = checkIfAtBottom();
    setIsAtBottom(atBottom);
    if (atBottom) {
      setHasNewMessages(false);
    }
  }, [checkIfAtBottom]);

  useEffect(() => {
    if (messages.length === 0) return;
    if (isAtBottom) {
      scrollToBottom(true);
    }
  }, [messages.length, isAtBottom]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch group details
        const detailsRes = await fetch(`/api/group-chats/${groupChatId}`);
        if (!detailsRes.ok) throw new Error('Failed to fetch group');
        const detailsData = await detailsRes.json();
        setGroupChat(detailsData.groupChat);
        setMembers(detailsData.members);
        setUserRole(detailsData.userRole);

        // Fetch messages
        const messagesRes = await fetch(`/api/group-chats/${groupChatId}/messages`);
        if (!messagesRes.ok) throw new Error('Failed to fetch messages');
        const messagesData = await messagesRes.json();

        // Deduplicate messages by ID
        revokeMediaUrls();
        const uniqueMessages = Array.from(
          new Map(messagesData.messages.map((m: Message) => [m.id, m])).values()
        ) as Message[];

        const memberIds = await fetchMemberIds();
        let canDecrypt = false;
        try {
          await ensureConversationKey('group', groupChatId, memberIds);
          canDecrypt = true;
        } catch (error) {
          console.warn('Failed to ensure group key:', error);
        }

        const decryptedMessages = await Promise.all(
          uniqueMessages.map(async (msg) => {
            let content = msg.content;
            const contentNonce = msg.contentNonce || undefined;
            const isEncrypted = !!msg.isEncrypted || !!contentNonce;
            if (isEncrypted) {
              if (!contentNonce || !canDecrypt) {
                content = '[Encrypted message]';
              } else {
                const decrypted = await decryptMessage('group', groupChatId, msg.content, contentNonce);
                content = decrypted ?? '[Encrypted message]';
              }
            }

            if (!isEncrypted && msg.content) {
              try {
                const encrypted = await encryptMessage('group', groupChatId, memberIds, msg.content);
                await fetch('/api/messages/encrypt', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'group',
                    id: msg.id,
                    content: encrypted.ciphertext,
                    contentNonce: encrypted.nonce,
                  }),
                });
              } catch (error) {
                console.error('Failed to migrate group encryption:', error);
              }
            }

            let mediaUrl = msg.mediaUrl || undefined;
            if (msg.mediaEncrypted && msg.mediaNonce && mediaUrl) {
              try {
                const mediaResponse = await fetch(mediaUrl);
                const mediaBuffer = await mediaResponse.arrayBuffer();
                const decryptedBlob = await decryptFile('group', groupChatId, mediaBuffer, msg.mediaNonce);
                if (decryptedBlob) {
                  const decryptedUrl = URL.createObjectURL(decryptedBlob);
                  mediaUrlsRef.current.push(decryptedUrl);
                  mediaUrl = decryptedUrl;
                }
              } catch (error) {
                console.error('Failed to decrypt group media:', error);
                mediaUrl = undefined;
              }
            }

            return {
              ...msg,
              content,
              mediaUrl,
            } as Message;
          })
        );

        const atBottom = checkIfAtBottom();
        if (!atBottom && decryptedMessages.length > previousMessageCount.current) {
          setHasNewMessages(true);
        }

        // Check for new messages and show notification
        if (decryptedMessages.length > previousMessageCount.current) {
          // Only show notification if we had messages before (not on initial load)
          if (previousMessageCount.current > 0) {
            const newMessagesArray = decryptedMessages.slice(previousMessageCount.current);
            const lastNewMessage = newMessagesArray[newMessagesArray.length - 1];
            
            // Only notify if the new message is from another user
            if (lastNewMessage && lastNewMessage.sender && lastNewMessage.senderId !== session?.user?.id) {
              toast({
                title: `👥 New message in ${detailsData.groupChat.name}`,
                description: `${lastNewMessage.sender.displayName || lastNewMessage.sender.name || 'Someone'}: ${lastNewMessage.content.substring(0, 50)}${lastNewMessage.content.length > 50 ? '...' : ''}`,
                variant: 'message' as any,
                duration: 5000,
              });
            }
          }
          previousMessageCount.current = decryptedMessages.length;
        }
        setMessages(decryptedMessages);
      } catch (error) {
        console.error('Error fetching group chat:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load group chat',
        });
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchData();
      const interval = setInterval(fetchData, 3000);
      return () => {
        clearInterval(interval);
        revokeMediaUrls();
      };
    }
  }, [status, groupChatId, router, toast, groupChat, fetchMemberIds, revokeMediaUrls, checkIfAtBottom]);

  const handleSendMessage = async (text?: string, files?: File[]) => {
    const messageText = text || newMessage;
    if ((!messageText.trim() && (!files || files.length === 0)) || sending) return;

    setSending(true);
    try {
      const memberIds = await fetchMemberIds();
      const encrypted = await encryptMessage('group', groupChatId, memberIds, messageText.trim());

      let mediaUrl: string | undefined;
      let mediaType: string | undefined;
      let mediaEncrypted: boolean | undefined;
      let mediaNonce: string | undefined;

      if (files && files.length > 0) {
        const file = files[0];
        const encryptedFile = await encryptFile('group', groupChatId, memberIds, file);
        const formData = new FormData();
        formData.append('file', encryptedFile.file);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok) {
          throw new Error('Failed to upload file');
        }
        const uploadData = await uploadRes.json();
        mediaUrl = uploadData.url;
        mediaType = file.type.startsWith('image/')
          ? 'image'
          : file.type.startsWith('video/')
            ? 'video'
            : file.type.startsWith('audio/')
              ? 'audio'
              : 'file';
        mediaEncrypted = true;
        mediaNonce = encryptedFile.mediaNonce;
      }

      const response = await fetch(`/api/group-chats/${groupChatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: encrypted.ciphertext,
          contentNonce: encrypted.nonce,
          isEncrypted: true,
          ...(mediaUrl && { mediaUrl }),
          ...(mediaType && { mediaType }),
          ...(mediaEncrypted && { mediaEncrypted }),
          ...(mediaNonce && { mediaNonce }),
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();
      setMessages([...messages, data.message]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send message',
      });
    } finally {
      setSending(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return;

    try {
      const response = await fetch(`/api/group-chats/${groupChatId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to leave group');

      toast({
        title: 'Left group',
        description: 'You have left the group chat',
      });

      router.push('/');
    } catch (error) {
      console.error('Error leaving group:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to leave group',
      });
    }
  };

  const fetchAvailableFriends = async () => {
    try {
      const response = await fetch('/api/friends');
      if (!response.ok) throw new Error('Failed to fetch friends');
      const data = await response.json();
      
      // Filter out friends who are already members
      const memberIds = new Set(members.map(m => m.userId));
      const available = data.friends
        .filter((f: any) => f.status === 'accepted' && f.friend && !memberIds.has(f.friend.id))
        .map((f: any) => f.friend);
      
      setAvailableFriends(available);
    } catch (error) {
      console.error('Error fetching friends:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load friends',
      });
    }
  };

  const handleAddMember = async (friendId: string) => {
    setAddingMember(true);
    try {
      const response = await fetch(`/api/group-chats/${groupChatId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newMemberId: friendId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add member');
      }

      toast({
        title: 'Member added',
        description: 'Successfully added member to the group',
      });

      // Refresh members list
      const detailsRes = await fetch(`/api/group-chats/${groupChatId}`);
      if (detailsRes.ok) {
        const detailsData = await detailsRes.json();
        setMembers(detailsData.members);
      }

      setShowAddMember(false);
      await fetchAvailableFriends(); // Refresh available friends
    } catch (error: any) {
      console.error('Error adding member:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to add member',
        description: error.message || 'An error occurred',
      });
    } finally {
      setAddingMember(false);
    }
  };

  // Fetch available friends when showing add member dialog
  useEffect(() => {
    if (showAddMember) {
      fetchAvailableFriends();
    }
  }, [showAddMember, members]);

  if (loading || status === 'loading') {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!groupChat) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <p className="text-muted-foreground">Group chat not found</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col min-h-0 bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-panel border-b border-white/10 p-4 flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">{groupChat.name}</h1>
              <p className="text-xs text-muted-foreground">
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary"
            onClick={() => router.push(`/call?room=group-${groupChatId}&type=voice`)}
            aria-label="Start voice call"
          >
            <Phone className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-primary"
            onClick={() => router.push(`/call?room=group-${groupChatId}&type=video`)}
            aria-label="Start video call"
          >
            <Video className="w-5 h-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowMembers(true)}>
                View Members
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLeaveGroup} className="text-destructive">
                Leave Group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.header>

      {/* Messages */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 relative"
        onScroll={handleScroll}
      >
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No messages yet</p>
              <p className="text-xs mt-1">Be the first to send a message!</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const showAvatar = index === 0 || messages[index - 1].userId !== message.userId;
              
              return (
                <ChatMessage
                  key={message.id}
                  showAvatar={showAvatar}
                  message={{
                    id: message.id,
                    content: message.content,
                    timestamp: new Date(message.createdAt),
                    author: {
                      uid: message.userId,
                      displayName: message.sender?.displayName || message.sender?.name || 'User',
                      photoURL: message.sender?.photoURL || '',
                      imageHint: (message.sender?.displayName || message.sender?.name || message.sender?.email || 'U').substring(0, 2).toUpperCase(),
                    },
                    reactions: [],
                    isFlagged: false,
                  }}
                />
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {hasNewMessages && (
          <div className="absolute bottom-4 right-4">
            <Button
              size="sm"
              className="rounded-full glass-card shadow-lg border border-primary/30 hover:scale-105 transition-transform bg-primary/20 hover:bg-primary/30 flex items-center gap-2"
              onClick={() => {
                scrollToBottom(true);
                setHasNewMessages(false);
              }}
            >
              <span className="text-xs font-medium">New messages</span>
              <ArrowDown className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="glass-panel border-t border-white/10 p-4">
        <ChatInput
          value={newMessage}
          onChange={setNewMessage}
          onSend={(text, files) => handleSendMessage(text, files)}
          placeholder={`Message ${groupChat.name}`}
          disabled={sending}
        />
      </div>

      {/* Members Dialog */}
      <Dialog open={showMembers} onOpenChange={setShowMembers}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Group Members</DialogTitle>
            <DialogDescription>
              {members.length} {members.length === 1 ? 'member' : 'members'} in this group
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <UserAvatar
                    src={member.user?.photoURL || ''}
                    fallback={(member.user?.displayName || member.user?.name || member.user?.email || 'U').substring(0, 2).toUpperCase()}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {member.user?.displayName || member.user?.name || member.user?.email}
                    </p>
                    {member.role === 'admin' && (
                      <p className="text-xs text-primary">Admin</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          {userRole === 'admin' && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="default"
                className="w-full gap-2"
                onClick={() => {
                  setShowMembers(false);
                  setShowAddMember(true);
                }}
              >
                <Users className="w-4 h-4" />
                Add Member
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>
              Select a friend to add to this group
            </DialogDescription>
          </DialogHeader>
          {availableFriends.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No friends available to add
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {availableFriends.map((friend) => (
                  <motion.button
                    key={friend.id}
                    onClick={() => handleAddMember(friend.id)}
                    disabled={addingMember}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <UserAvatar
                      src={friend.photoURL || ''}
                      fallback={(friend.displayName || friend.name || friend.email || 'U').substring(0, 2).toUpperCase()}
                    />
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">
                        {friend.displayName || friend.name || friend.email}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
