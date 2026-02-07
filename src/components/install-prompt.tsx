'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setShowPrompt(false);
    }
    
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-50 max-w-xs animate-in fade-in slide-in-from-right">
      <div className="bg-gradient-to-br from-accent to-accent/80 rounded-xl backdrop-blur-xl shadow-2xl border border-white/20 p-4 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-bold text-white mb-1">Install Moswords</h3>
            <p className="text-sm text-white/90">Get instant access from your home screen</p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0 ml-2"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleInstall}
            className="flex-1 bg-white text-accent hover:bg-white/90"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Install
          </Button>
          <Button
            onClick={handleDismiss}
            variant="outline"
            size="sm"
            className="border-white/20 text-white hover:bg-white/10"
          >
            Later
          </Button>
        </div>
      </div>
    </div>
  );
}
