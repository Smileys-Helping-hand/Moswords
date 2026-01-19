"use client";

import { useState } from 'react';
import { Plus, Hash, Volume2, Lock } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Switch } from './ui/switch';
import { useToast } from '@/hooks/use-toast';

interface CreateChannelDialogProps {
  serverId?: string;
  onChannelCreated?: () => void;
}

export default function CreateChannelDialog({ serverId, onChannelCreated }: CreateChannelDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelType, setChannelType] = useState('text');
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);

  const { toast } = useToast();

  const handleCreate = async () => {
    if (!channelName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a channel name',
      });
      return;
    }

    if (!serverId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No server selected',
      });
      return;
    }
    
    setCreating(true);
    
    try {
      const response = await fetch(`/api/servers/${serverId}/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: channelName.trim(),
          type: channelType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create channel');
      }

      const data = await response.json();
      
      toast({
        title: 'Success!',
        description: `Channel "${data.channel.name}" created successfully`,
      });
      
      setIsOpen(false);
      resetState();
      onChannelCreated?.();
    } catch (error) {
      console.error('Error creating channel:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create channel. Please try again.',
      });
    } finally {
      setCreating(false);
    }
  };

  const resetState = () => {
    setChannelName('');
    setChannelType('text');
    setIsPrivate(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="w-6 h-6 hover:text-primary">
          <Plus className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-white/20 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gradient">Create Channel</DialogTitle>
          <DialogDescription>
            Add a new channel to your server
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="channel-type">Channel Type</Label>
            <Select value={channelType} onValueChange={setChannelType}>
              <SelectTrigger id="channel-type" className="glass-card border-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-card border-white/20">
                <SelectItem value="text">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    Text Channel
                  </div>
                </SelectItem>
                <SelectItem value="voice">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    Voice Channel
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel-name">Channel Name</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {channelType === 'text' ? '#' : '🔊'}
              </span>
              <Input
                id="channel-name"
                placeholder="new-channel"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                className="pl-8 glass-card border-white/20"
              />
            </div>
          </div>

          <div className="flex items-center justify-between glass-card p-3 rounded-lg border border-white/10">
            <div className="space-y-0.5">
              <Label htmlFor="private" className="text-sm font-medium flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Private Channel
              </Label>
              <p className="text-xs text-muted-foreground">
                Only selected members can see this channel
              </p>
            </div>
            <Switch
              id="private"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
              onClick={handleCreate}
              disabled={!channelName.trim() || creating}
            >
              {creating ? 'Creating...' : 'Create Channel'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
