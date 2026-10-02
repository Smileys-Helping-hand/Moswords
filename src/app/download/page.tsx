'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Download, Loader2, Share, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MoswordsIcon } from '@/components/icons';

interface ReleaseInfo {
  versionName: string;
  fileName: string;
  size: number;
  sha256: string;
  minAndroid: string;
  releasedAt: string;
  notes?: string[];
}

type Device = 'android' | 'ios' | 'other';

/** Public page: install the Android app, or add the web app to an iPhone home screen. */
export default function DownloadPage() {
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [failed, setFailed] = useState(false);
  const [device, setDevice] = useState<Device>('other');
  const [inApp, setInApp] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setDevice(/android/i.test(ua) ? 'android' : /iphone|ipad|ipod/i.test(ua) ? 'ios' : 'other');
    setInApp(/MoswordsApp/.test(ua));
    fetch('/api/download/android?info=1')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setRelease(d.release))
      .catch(() => setFailed(true));
  }, []);

  const sizeMb = release ? (release.size / 1024 / 1024).toFixed(1) : null;

  return (
    <div className="min-h-[100dvh] bg-background pb-24 md:pb-10">
      <header className="flex items-center gap-2 px-4 py-3">
        <Button variant="ghost" size="icon" asChild aria-label="Back">
          <Link href="/"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
      </header>

      <main className="mx-auto max-w-md space-y-5 px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-neutral-950/80 border border-white/15 shadow-[0_0_35px_rgba(0,240,255,0.35)] backdrop-blur-xl">
            <MoswordsIcon className="h-12 w-12 text-white drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]" />
          </span>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] font-semibold tracking-wider uppercase">
              Second Brain Ecosystem
            </div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent">
              Moswords on your phone
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            The app opens straight into your chats, keeps you signed in and gets its own icon on your home screen.
          </p>
        </div>

        {inApp && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
            You&apos;re already using the app. Download again here whenever there&apos;s a new version.
          </div>
        )}

        {/* Android */}
        <section className={`space-y-3 rounded-2xl border bg-card p-4 ${device === 'android' ? 'border-primary/50' : 'border-border/50'}`}>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Android</h2>
            {release && (
              <span className="ml-auto text-xs text-muted-foreground">
                v{release.versionName} · {sizeMb} MB · Android {release.minAndroid}+
              </span>
            )}
          </div>

          {failed ? (
            <p className="text-sm text-muted-foreground">The download isn&apos;t available right now. Please try again later.</p>
          ) : (
            <Button asChild size="lg" className="w-full" disabled={!release}>
              <a href="/api/download/android" download>
                {release ? <Download className="mr-2 h-5 w-5" /> : <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Download for Android
              </a>
            </Button>
          )}

          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>Tap <b>Download for Android</b> and open the file when it finishes.</li>
            <li>If Android asks, allow your browser to <b>install unknown apps</b> (this app isn&apos;t on the Play Store yet).</li>
            <li>Tap <b>Install</b>, open Moswords and sign in.</li>
          </ol>
          <p className="rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground">
            Installed an older Moswords app before October 2026? Uninstall it first: this version is signed with a new key,
            so Android won&apos;t update over the old one. Your chats are safe on the server.
          </p>

          {release?.notes?.length ? (
            <div className="text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground/80">What&apos;s new</p>
              <ul className="list-disc space-y-0.5 pl-4">
                {release.notes.map((n) => <li key={n}>{n}</li>)}
              </ul>
            </div>
          ) : null}
          {release && (
            <details className="text-[11px] text-muted-foreground">
              <summary className="cursor-pointer">File checksum (SHA-256)</summary>
              <code className="mt-1 block break-all">{release.sha256}</code>
            </details>
          )}
        </section>

        {/* iPhone */}
        <section className={`space-y-2 rounded-2xl border bg-card p-4 ${device === 'ios' ? 'border-primary/50' : 'border-border/50'}`}>
          <div className="flex items-center gap-2">
            <Share className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">iPhone and iPad</h2>
          </div>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>Open <b>awehchat.co.za</b> in Safari.</li>
            <li>Tap the <b>Share</b> button, then <b>Add to Home Screen</b>.</li>
            <li>Open Moswords from your home screen. It runs full-screen like an app.</li>
          </ol>
        </section>

        <p className="text-center text-xs text-muted-foreground">
          <Link href="/" className="text-primary hover:underline">Continue in the browser</Link>
        </p>
      </main>
    </div>
  );
}
