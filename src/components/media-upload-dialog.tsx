"use client";

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, Image as ImageIcon, File, Video, Loader2, Camera, FolderOpen } from 'lucide-react';
import Image from 'next/image';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Progress } from './ui/progress';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useMobileFeatures } from '@/hooks/use-mobile-features';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';

interface MediaUploadDialogProps {
  onUploadComplete?: (url: string, type: 'image' | 'video' | 'audio' | 'file') => void;
}

export default function MediaUploadDialog({ onUploadComplete }: MediaUploadDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [optimized, setOptimized] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const { toast } = useToast();
  const { isNative, haptic } = useMobileFeatures();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const acceptAnyFile = true;

  const startUpload = async (selectedFile: File, previewUrl?: string) => {
    setFile(selectedFile);
    setPreview(previewUrl || null);

    // Auto-upload immediately after selection
    await handleUpload(selectedFile);
  };

  // Handle native camera capture
  const handleCameraCapture = async () => {
    if (!isNative) {
      imageInputRef.current?.click();
      return;
    }

    try {
      await haptic.light();
      
      const image = await CapCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      if (image.dataUrl) {
        // Convert data URL to Blob then File
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        const fileName = `camera-${Date.now()}.${image.format || 'jpg'}`;
        const fileObj = new window.File([blob], fileName, { type: `image/${image.format || 'jpeg'}` });
        
        await startUpload(fileObj, image.dataUrl);
        
        await haptic.success();
      }
    } catch (error: any) {
      if (error.message !== 'User cancelled photos app') {
        console.error('Camera error:', error);
        toast({
          variant: 'destructive',
          title: 'Camera error',
          description: 'Failed to capture photo. Please try again.',
        });
        await haptic.error();
      }
    }
  };

  // Handle native photo library selection
  const handlePhotoLibrary = async () => {
    if (!isNative) {
      imageInputRef.current?.click();
      return;
    }

    try {
      await haptic.light();
      
      const image = await CapCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
      });

      if (image.dataUrl) {
        // Convert data URL to Blob then File
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        const fileName = `photo-${Date.now()}.${image.format || 'jpg'}`;
        const fileObj = new window.File([blob], fileName, { type: `image/${image.format || 'jpeg'}` });
        
        await startUpload(fileObj, image.dataUrl);
        
        await haptic.success();
      }
    } catch (error: any) {
      if (error.message !== 'User cancelled photos app') {
        console.error('Photo library error:', error);
        toast({
          variant: 'destructive',
          title: 'Photo library error',
          description: 'Failed to select photo. Please try again.',
        });
        await haptic.error();
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (isNative) {
      await haptic.light();
    }

    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const previewUrl = event.target?.result as string | undefined;
        await startUpload(selectedFile, previewUrl);
      };
      reader.readAsDataURL(selectedFile);
      return;
    }

    await startUpload(selectedFile);
  };

  const handleUpload = async (selectedFile?: File) => {
    const fileToUpload = selectedFile || file;
    if (!fileToUpload) return;

    if (isNative) {
      await haptic.medium();
    }

    setUploading(true);
    setProgress(10);
    
    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);

      setProgress(30);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      setProgress(80);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      setProgress(100);

      toast({
        title: 'Upload complete!',
        description: 'Your file has been uploaded successfully.',
      });

      if (isNative) {
        await haptic.success();
      }

      // Call the callback with the URL and type
      if (onUploadComplete) {
        onUploadComplete(data.url, data.type);
      }

      setIsOpen(false);
      resetState();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message || 'Failed to upload file. Please try again.',
      });
      
      if (isNative) {
        await haptic.error();
      }
    } finally {
      setUploading(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setPreview(null);
    setProgress(0);
    setOptimized(true);
  };

  const getFileIcon = () => {
    if (!file) return <Upload className="w-12 h-12 text-muted-foreground" />;
    
    if (file.type.startsWith('image/')) return <ImageIcon className="w-12 h-12 text-primary" />;
    if (file.type.startsWith('video/')) return <Video className="w-12 h-12 text-primary" />;
    return <File className="w-12 h-12 text-primary" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:text-primary h-8 w-8">
          <Upload className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-white/20 sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gradient">Upload Media</DialogTitle>
          <DialogDescription>
            Share images, videos, or files with your team
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!file ? (
            <>
              {/* Mobile Native Options */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <motion.button
                  type="button"
                  onClick={handleCameraCapture}
                  className="flex flex-col items-center justify-center p-6 glass-card rounded-xl hover:bg-white/5 transition-colors border-2 border-white/10"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Camera className="w-8 h-8 mb-2 text-primary" />
                  <span className="text-sm font-medium">Camera</span>
                </motion.button>
                
                <motion.button
                  type="button"
                  onClick={handlePhotoLibrary}
                  className="flex flex-col items-center justify-center p-6 glass-card rounded-xl hover:bg-white/5 transition-colors border-2 border-white/10"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ImageIcon className="w-8 h-8 mb-2 text-primary" />
                  <span className="text-sm font-medium">Photos</span>
                </motion.button>

                <motion.button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-6 glass-card rounded-xl hover:bg-white/5 transition-colors border-2 border-white/10"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Video className="w-8 h-8 mb-2 text-primary" />
                  <span className="text-sm font-medium">Video</span>
                </motion.button>

                <motion.button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-6 glass-card rounded-xl hover:bg-white/5 transition-colors border-2 border-white/10"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Upload className="w-8 h-8 mb-2 text-primary" />
                  <span className="text-sm font-medium">Audio</span>
                </motion.button>
              </div>

              {/* File Browser Option */}
              <motion.label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-white/20 rounded-xl cursor-pointer glass-card hover:bg-white/5 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <FolderOpen className="w-10 h-10 mb-3 text-muted-foreground" />
                  <p className="mb-2 text-sm text-foreground">
                    <span className="font-semibold">{isNative ? 'Browse Files' : 'Click to upload'}</span>
                    {!isNative && ' or drag and drop'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, GIF, MP4, or any file up to 10MB
                  </p>
                </div>
                <input
                  id="file-upload"
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept={acceptAnyFile ? '*/*' : 'image/*,video/*,audio/*,.pdf,.doc,.docx'}
                />

                <input
                  ref={imageInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/*"
                  capture="environment"
                />

                <input
                  ref={videoInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept="video/*"
                  capture="environment"
                />

                <input
                  ref={audioInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept="audio/*"
                  capture
                />
              </motion.label>
            </>
          ) : (
            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="glass-card p-4 rounded-xl">
                {preview ? (
                  <Image
                    src={preview}
                    alt="Preview"
                    width={800}
                    height={192}
                    className="w-full h-48 object-cover rounded-lg"
                    unoptimized
                  />
                ) : (
                  <div className="flex items-center justify-center h-48">
                    {getFileIcon()}
                  </div>
                )}
                <div className="mt-3">
                  <p className="text-sm font-semibold truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 rounded-full bg-background/80 hover:bg-background"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {file && file.type.startsWith('image/') && (
            <div className="flex items-center justify-between glass-card p-3 rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="optimize" className="text-sm font-medium">
                  Optimize Image
                </Label>
                <p className="text-xs text-muted-foreground">
                  Convert to WebP and reduce file size
                </p>
              </div>
              <Switch
                id="optimize"
                checked={optimized}
                onCheckedChange={setOptimized}
              />
            </div>
          )}

          {uploading && (
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                Uploading... {progress}%
              </p>
            </motion.div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsOpen(false)}
              disabled={uploading}
            >
              Close
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
              onClick={() => handleUpload()}
              disabled={!file || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload Again'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
