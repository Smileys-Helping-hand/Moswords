'use client';

import { useEffect, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QrCode, Share2, Download, Loader } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import jsQR from 'jsqr';
import { useAuth } from '@/hooks/use-auth';
import UserAvatar from '@/components/user-avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useMobileFeatures } from '@/hooks/use-mobile-features';

interface QRContactSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ScannedUser = {
  id: string;
  displayName: string;
  name: string;
  photoURL: string | null;
};

export default function QRContactSheet({ open, onOpenChange }: QRContactSheetProps) {
  const { session } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { haptic } = useMobileFeatures();

  const qrRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scannedUser, setScannedUser] = useState<ScannedUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  const userId = (session?.user as any)?.id || (session?.user as any)?.uid;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://moswords.app';
  const qrValue = userId ? `${appUrl}/add/${userId}` : '';

  useEffect(() => {
    if (open) {
      setCameraError(null);
      setScanning(false);
      setScannedUser(null);
    }
  }, [open]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      setScanning(true);
      haptic.light();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        scanQRCode();
      }
    } catch (error) {
      console.error('Camera error:', error);
      haptic.error?.();
      const err = error as any;
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please enable in settings.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Failed to access camera.');
      }
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }
    setScanning(false);
  };

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current || !scanning) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const video = videoRef.current;
    canvasRef.current.width = video.videoWidth;
    canvasRef.current.height = video.videoHeight;

    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);

    try {
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        const scannedUrl = code.data;
        // Extract user ID from URL like: https://moswords.app/add/userId
        const match = scannedUrl.match(/\/add\/([^/?]+)/);
        if (match) {
          const scannedId = match[1];
          if (scannedId === userId) {
            setCameraError('That\'s your own code!');
            haptic.light();
          } else {
            fetchScannedUser(scannedId);
            stopCamera();
            haptic.success?.();
          }
        } else {
          setCameraError('Invalid QR code');
          haptic.light();
        }
        return;
      }
    } catch (error) {
      console.error('QR decode error:', error);
    }

    animationRef.current = requestAnimationFrame(scanQRCode);
  };

  const fetchScannedUser = async (userId: string) => {
    try {
      setLoadingUser(true);
      const res = await fetch(`/api/users/${userId}`);
      if (!res.ok) throw new Error('User not found');
      const data = await res.json();
      setScannedUser(data);
    } catch (error) {
      console.error('Error fetching scanned user:', error);
      setCameraError('User not found');
      haptic.error?.();
    } finally {
      setLoadingUser(false);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!scannedUser) return;
    try {
      haptic.light();
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId: scannedUser.id }),
      });
      if (!res.ok) throw new Error('Failed to send request');
      haptic.success?.();
      toast({
        title: 'Friend request sent!',
        description: `Waiting for ${scannedUser.displayName}'s response.`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending friend request:', error);
      haptic.error?.();
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send friend request',
      });
    }
  };

  const handleSendMessage = () => {
    if (!scannedUser) return;
    haptic.light();
    onOpenChange(false);
    router.push(`/dm/${scannedUser.id}`);
  };

  const downloadQR = () => {
    haptic.light();
    const element = qrRef.current?.querySelector('canvas') as HTMLCanvasElement;
    if (!element) return;
    const url = element.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = 'my-moswords-qr.png';
    link.click();
  };

  const shareQR = async () => {
    haptic.light();
    const element = qrRef.current?.querySelector('canvas') as HTMLCanvasElement;
    if (!element) return;

    try {
      const blob = await new Promise<Blob>((resolve) => {
        element.toBlob((blob) => resolve(blob!));
      });

      if (navigator.share && navigator.canShare({ files: [new File([blob], 'qr.png')] })) {
        await navigator.share({
          title: 'My Moswords QR Code',
          text: 'Scan my QR code to add me on Moswords',
          files: [new File([blob], 'moswords-qr.png', { type: 'image/png' })],
        });
        haptic.success?.();
      } else {
        // Fallback: copy link to clipboard
        await navigator.clipboard.writeText(qrValue);
        toast({
          title: 'Link copied',
          description: 'Share this link to add you',
        });
        haptic.light();
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b border-border/50">
          <SheetTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Scan & Share
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="show" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start px-6 py-2 bg-transparent border-b border-border/50 rounded-none">
            <TabsTrigger value="show">My Code</TabsTrigger>
            <TabsTrigger value="scan">Scan</TabsTrigger>
          </TabsList>

          {/* Show My QR Code */}
          <TabsContent value="show" className="flex-1 overflow-auto flex flex-col items-center justify-center gap-6 px-6 py-8">
            {qrValue && (
              <>
                <motion.div
                  ref={qrRef}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="p-6 rounded-2xl bg-white relative"
                >
                  {/* Animated gradient border */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-border pointer-events-none"
                    animate={{
                      borderColor: ['hsl(var(--primary))', 'hsl(var(--primary) / 0.5)', 'hsl(var(--primary))'],
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                  <div className="relative z-10">
                    <QRCodeCanvas
                      value={qrValue}
                      size={200}
                      level="H"
                      includeMargin
                      fgColor="#000"
                      bgColor="#fff"
                    />
                  </div>
                </motion.div>

                {session?.user && (
                  <div className="text-center">
                    <UserAvatar
                      src={session.user.image || ''}
                      fallback={(session.user.name || session.user.email || 'U').substring(0, 2).toUpperCase()}
                    />
                    <p className="font-semibold">{session.user.name}</p>
                  </div>
                )}

                <div className="flex gap-3 w-full">
                  <Button
                    onClick={shareQR}
                    variant="outline"
                    className="flex-1 rounded-lg gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                  <Button
                    onClick={downloadQR}
                    variant="outline"
                    className="flex-1 rounded-lg gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* Scan QR Code */}
          <TabsContent value="scan" className="flex-1 overflow-auto flex flex-col">
            {!scanning ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <QrCode className="w-10 h-10 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-semibold">Scan a QR code</p>
                  <p className="text-sm text-muted-foreground">Point your camera at someone's QR code</p>
                </div>
                <Button onClick={startCamera} className="rounded-lg gap-2" size="lg">
                  <QrCode className="w-4 h-4" />
                  Open Camera
                </Button>
              </div>
            ) : cameraError ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
                <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                  <QrCode className="w-10 h-10 text-destructive" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-destructive">{cameraError}</p>
                </div>
                <Button onClick={stopCamera} variant="outline" className="rounded-lg">
                  Go Back
                </Button>
              </div>
            ) : scannedUser ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 py-8">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center"
                >
                  <UserAvatar
                    src={scannedUser.photoURL || ''}
                    fallback={(scannedUser.displayName || scannedUser.name || 'U').substring(0, 2).toUpperCase()}
                  />
                  <p className="font-semibold text-lg">{scannedUser.displayName || scannedUser.name}</p>
                  {loadingUser && <p className="text-sm text-muted-foreground">Loading...</p>}
                </motion.div>

                {!loadingUser && (
                  <div className="flex flex-col gap-2 w-full">
                    <Button onClick={handleSendFriendRequest} className="rounded-lg" size="lg">
                      Add Friend
                    </Button>
                    <Button onClick={handleSendMessage} variant="outline" className="rounded-lg" size="lg">
                      Send Message
                    </Button>
                    <Button
                      onClick={() => {
                        stopCamera();
                        setScannedUser(null);
                      }}
                      variant="ghost"
                      className="rounded-lg"
                    >
                      Scan Another
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-full aspect-square max-w-sm rounded-2xl bg-black overflow-hidden relative border-2 border-primary/50">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                  />
                  {/* Viewfinder overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-64 border-2 border-primary rounded-2xl relative">
                      {/* Corner guides */}
                      {[
                        'top-0 left-0',
                        'top-0 right-0 rotate-90',
                        'bottom-0 right-0 rotate-180',
                        'bottom-0 left-0 -rotate-90',
                      ].map((cls, i) => (
                        <div
                          key={i}
                          className={`absolute w-8 h-8 border-2 border-primary ${cls}`}
                          style={{
                            clipPath: 'polygon(0 0, 100% 0, 100% 20%, 20% 20%, 20% 100%, 0 100%)',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={stopCamera}
                  variant="outline"
                  className="rounded-lg mt-4"
                >
                  Close Camera
                </Button>
              </div>
            )}

            {/* Hidden canvas for QR processing */}
            <canvas ref={canvasRef} className="hidden" />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
