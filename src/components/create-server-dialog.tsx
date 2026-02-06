"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface CreateServerDialogProps {
  onServerCreated?: () => void;
}

export default function CreateServerDialog({ onServerCreated }: CreateServerDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [serverName, setServerName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!serverName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a server name',
      });
      return;
    }
    
    setCreating(true);
    
    try {
      const response = await fetch('/api/servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: serverName.trim(),
          imageUrl: imageUrl.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create server');
      }

      const data = await response.json();
      
      toast({
        title: 'Success!',
        description: `Server "${data.server.name}" created successfully`,
      });
      
      setIsOpen(false);
      resetState();
      onServerCreated?.();

      // Navigate immediately to the new server's general channel
      router.push(`/servers/${data.server.id}/channels/${data.generalChannelId}`);
    } catch (error) {
      console.error('Error creating server:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create server. Please try again.',
      });
    } finally {
      setCreating(false);
    }
  };

  const resetState = () => {
    setServerName('');
    setImageUrl('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-12 h-12 rounded-full glass-card hover:bg-green-500/20 text-green-400 hover:text-green-300 transition-all duration-300 group border border-green-500/20"
          >
            <motion.div
              animate={{ rotate: 0 }}
              whileHover={{ rotate: 90 }}
              transition={{ duration: 0.3 }}
            >
              <Plus />
            </motion.div>
          </Button>
        </motion.div>
      </DialogTrigger>
      <DialogContent className="glass-card border-white/20 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gradient">Create Your Server</DialogTitle>
          <DialogDescription>
            Give your new server a name and personality! You can always change it later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="server-name">Server Name</Label>
            <Input
              id="server-name"
              placeholder="My Awesome Server"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              className="glass-card border-white/20"
              disabled={creating}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !creating) {
                  handleCreate();
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="server-image">Server Image URL (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="server-image"
                placeholder="https://example.com/image.png"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="glass-card border-white/20"
                disabled={creating}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty for a random image
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-4">
          <Button
            variant="ghost"
            onClick={() => setIsOpen(false)}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating || !serverName.trim()}
            className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
          >
            {creating ? 'Creating...' : 'Create Server'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
