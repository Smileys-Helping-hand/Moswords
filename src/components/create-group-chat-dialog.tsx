"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Loader2, X } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import UserAvatar from './user-avatar';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';

interface Friend {
  id: string;
  userId: string;
  friendId: string;
  status: string;
  friend?: {
    id: string;
    email: string;
    name: string | null;
    displayName: string | null;
    photoURL: string | null;
  };
}

export default function CreateGroupChatDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const handleOpen = async (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setLoading(true);
      try {
        const response = await fetch('/api/friends');
        if (!response.ok) throw new Error('Failed to fetch friends');
        const data = await response.json();
        
        // Get all accepted friends and filter out any null friend objects
        const acceptedFriends = data.friends
          .filter((f: Friend) => f.status === 'accepted' && f.friend)
          .map((f: Friend) => ({
            ...f,
            friend: {
              ...f.friend,
              displayName: f.friend?.displayName || f.friend?.name || f.friend?.email?.split('@')[0] || 'User'
            }
          }));
        
        setFriends(acceptedFriends);
      } catch (error) {
        console.error('Error fetching friends:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load friends',
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleFriend = (friendId: string) => {
    const newSelected = new Set(selectedFriends);
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId);
    } else {
      newSelected.add(friendId);
    }
    setSelectedFriends(newSelected);
  };

  const handleCreate = async () => {
    // Validate group name
    if (!groupName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please enter a group name',
      });
      return;
    }

    // Validate member selection
    if (selectedFriends.size === 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select at least one friend',
      });
      return;
    }

    setCreating(true);
    
    try {
      // Prepare payload with correct member IDs
      const memberIds = Array.from(selectedFriends);
      
      console.log('Creating group with payload:', {
        name: groupName.trim(),
        description: description.trim() || undefined,
        memberIds,
      });

      // Make API call and explicitly await response
      const response = await fetch('/api/group-chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: groupName.trim(),
          description: description.trim() || undefined,
          memberIds,
        }),
      });

      // Parse response data
      const data = await response.json();

      // Check if request failed
      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status} ${response.statusText}`);
      }

      // Verify we got a valid groupChat object with ID
      if (!data.groupChat || !data.groupChat.id) {
        throw new Error('Invalid response: Missing group ID');
      }

      console.log('Group created successfully:', data.groupChat);

      // Show success message
      toast({
        title: 'Success!',
        description: `Group "${groupName}" created with ${data.memberCount || selectedFriends.size} members`,
      });

      // Reset form
      setGroupName('');
      setDescription('');
      setSelectedFriends(new Set());
      setIsOpen(false);

      // Navigate to the newly created group
      window.location.href = `/group/${data.groupChat.id}`;
      
    } catch (error: any) {
      console.error('Error creating group:', error);
      
      // Keep modal open and show detailed error
      toast({
        variant: 'destructive',
        title: 'Failed to Create Group',
        description: error.message || 'An unexpected error occurred. Please try again.',
      });
      
      // Don't close modal or reset form on error
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Users className="w-4 h-4" />
          Create Group
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Group Chat</DialogTitle>
          <DialogDescription>
            Create a group chat with your friends
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name *</Label>
            <Input
              id="name"
              placeholder="Enter group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="What's this group about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Members *</Label>
              <Badge variant="secondary">
                {selectedFriends.size} selected
              </Badge>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No friends to add. Add some friends first!
              </div>
            ) : (
              <ScrollArea className="h-[200px] rounded-md border p-2">
                <div className="space-y-2">
                  {friends.map((friend) => {
                    const user = friend.friend;
                    if (!user) return null;

                    const isSelected = selectedFriends.has(user.id);

                    return (
                      <motion.button
                        key={user.id}
                        onClick={() => toggleFriend(user.id)}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                          isSelected
                            ? 'bg-primary/20 border-2 border-primary'
                            : 'bg-muted/50 hover:bg-muted border-2 border-transparent'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <UserAvatar
                          src={user.photoURL || ''}
                          fallback={(user.displayName || user.name || user.email).substring(0, 2).toUpperCase()}
                        />
                        <div className="flex-1 text-left">
                          <p className="font-medium text-sm">
                            {user.displayName || user.name || user.email}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <span className="text-xs text-primary-foreground">✓</span>
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating || !groupName.trim() || selectedFriends.size === 0}
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Group'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
