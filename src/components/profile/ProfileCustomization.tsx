'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2, Sparkles, Check } from 'lucide-react';
import { motion } from 'framer-motion';

const AVATAR_FRAMES = [
  { id: 'none', name: 'None', className: '' },
  { id: 'neon', name: 'Neon Glow', className: 'ring-4 ring-primary shadow-lg shadow-primary/50' },
  { id: 'gold', name: 'Gold', className: 'ring-4 ring-yellow-500 shadow-lg shadow-yellow-500/50' },
  { id: 'rainbow', name: 'Rainbow', className: 'ring-4 ring-gradient animate-pulse' },
  { id: 'fire', name: 'Fire', className: 'ring-4 ring-orange-500 shadow-lg shadow-orange-500/50' },
  { id: 'ice', name: 'Ice', className: 'ring-4 ring-cyan-400 shadow-lg shadow-cyan-400/50' },
];

interface ProfileCustomizationProps {
  user: {
    banner?: string;
    avatarFrame?: string;
    bio?: string;
    status?: string;
  };
  onSave: (data: { banner: string; avatarFrame: string; bio: string; status: string }) => void;
}

export default function ProfileCustomization({ user, onSave }: ProfileCustomizationProps) {
  const { toast } = useToast();
  const [banner, setBanner] = useState(user.banner || '');
  const [avatarFrame, setAvatarFrame] = useState(user.avatarFrame || 'none');
  const [bio, setBio] = useState(user.bio || '');
  const [status, setStatus] = useState(user.status || '');
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Maximum file size is 5MB',
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setBanner(data.url);
      toast({
        title: 'Banner uploaded!',
        description: 'Your new banner has been uploaded successfully',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'Failed to upload banner image',
      });
    } finally {
      setUploading(false);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    maxFiles: 1,
  });

  const handleSave = () => {
    onSave({ banner, avatarFrame, bio, status });
  };

  return (
    <div className="space-y-6">
      {/* Banner Upload */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Profile Banner
        </Label>
        <div
          {...getRootProps()}
          className={`relative h-32 md:h-40 rounded-xl overflow-hidden cursor-pointer border-2 border-dashed transition-all ${
            isDragActive
              ? 'border-primary bg-primary/10'
              : 'border-white/20 hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          {banner ? (
            <img
              src={banner}
              alt="Banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              {uploading ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <>
                  <Upload className="w-8 h-8 mb-2" />
                  <p className="text-sm">
                    {isDragActive ? 'Drop image here' : 'Drag or tap to upload banner'}
                  </p>
                </>
              )}
            </div>
          )}
          {banner && (
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <p className="text-white text-sm">Click to change</p>
            </div>
          )}
        </div>
        <Input
          placeholder="Or paste a banner URL..."
          value={banner}
          onChange={(e) => setBanner(e.target.value)}
          className="glass-card border-white/20"
        />
      </div>

      {/* Avatar Frame Selection */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Avatar Frame
        </Label>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {AVATAR_FRAMES.map((frame) => (
            <motion.button
              key={frame.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setAvatarFrame(frame.id)}
              className={`relative p-3 rounded-xl transition-all ${
                avatarFrame === frame.id
                  ? 'bg-primary/20 border-2 border-primary'
                  : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
              }`}
            >
              <div
                className={`w-10 h-10 mx-auto rounded-full bg-gradient-to-br from-primary to-accent ${frame.className}`}
              />
              <p className="text-xs mt-2 text-center truncate">{frame.name}</p>
              {avatarFrame === frame.id && (
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="customize-bio">About Me</Label>
        <Textarea
          id="customize-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell others about yourself..."
          rows={3}
          className="glass-card border-white/20 resize-none"
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground text-right">{bio.length}/500</p>
      </div>

      {/* Custom Status */}
      <div className="space-y-2">
        <Label htmlFor="customize-status">Custom Status</Label>
        <Input
          id="customize-status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          placeholder="What are you up to?"
          className="glass-card border-white/20"
          maxLength={100}
        />
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        className="w-full bg-gradient-to-r from-primary to-accent"
      >
        Save Customization
      </Button>
    </div>
  );
}
