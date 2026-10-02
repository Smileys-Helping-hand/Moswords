'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MoswordsIcon } from '@/components/icons';
import { MessageSquare, Home } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  useEffect(() => {
    // Only attempt an auto-recovery redirect once
    const key = 'mw_404_recovery';
    const lastAttempt = sessionStorage.getItem(key);
    if (!lastAttempt) {
      sessionStorage.setItem(key, '1');
      const timer = setTimeout(() => {
        router.replace('/dm');
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setRedirectAttempted(true);
      sessionStorage.removeItem(key);
    }
  }, [router]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background px-4 text-center">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-neutral-950/80 border border-white/10 flex items-center justify-center shadow-[0_0_35px_rgba(0,240,255,0.25)]">
          <MoswordsIcon className="w-12 h-12 text-white drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]" />
        </div>
      </div>

      <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent mb-2">
        Page Not Found
      </h1>
      <p className="text-sm text-neutral-400 max-w-sm mb-8 leading-relaxed">
        The conversation or screen you requested doesn&apos;t exist or was moved.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <Button asChild className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium shadow-lg shadow-cyan-500/20">
          <Link href="/dm">
            <MessageSquare className="w-4 h-4 mr-2" />
            Go to Messages
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full border-white/10 hover:bg-white/5">
          <Link href="/">
            <Home className="w-4 h-4 mr-2" />
            Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
