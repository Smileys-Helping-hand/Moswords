'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, Shield, Zap, Lock } from 'lucide-react';

const features = [
  { icon: Shield, label: 'End-to-End Encrypted', desc: 'Every message is encrypted with AES-256-GCM so only you and your recipient can read it.' },
  { icon: Zap, label: 'Real-time Messaging', desc: 'Lightning-fast delivery with intelligent polling and offline-first caching.' },
  { icon: Lock, label: 'Privacy First', desc: 'No ads, no tracking. Your data stays yours.' },
  { icon: Sparkles, label: 'Servers & Communities', desc: 'Create and join servers with channels, voice calls, and community features.' },
];

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="min-h-[100svh] bg-background flex flex-col">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-4 bg-background/90 backdrop-blur-sm border-b border-border/50"
      >
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold">About</h1>
          <p className="text-xs text-muted-foreground">Moswords</p>
        </div>
      </motion.header>

      <div className="flex-1 overflow-y-auto p-4 max-w-2xl w-full mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-6">

          {/* Logo / branding */}
          <div className="flex flex-col items-center gap-3 pt-4 pb-2">
            <div className="w-20 h-20 rounded-3xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold">Moswords</h2>
              <p className="text-xs text-muted-foreground mt-1">Version 1.0.0</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground text-center px-4">
            A private, encrypted messaging app built for real connections — direct messages, group chats, voice &amp; video calls, and community servers.
          </p>

          {/* Feature list */}
          <div className="space-y-3">
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="glass-card rounded-2xl border border-white/10 p-4 flex items-start gap-3"
              >
                <f.icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">{f.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="glass-card rounded-2xl border border-white/10 p-4 text-center text-xs text-muted-foreground space-y-1">
            <p>Made with ❤️ by the Moswords team</p>
            <p className="text-[10px]">© 2025 Moswords. All rights reserved.</p>
          </div>

        </motion.div>
      </div>
    </div>
  );
}
