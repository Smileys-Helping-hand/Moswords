'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import AppearanceTab from '@/components/settings/AppearanceTab';

export default function AppearancePage() {
  const router = useRouter();

  return (
    <div className="min-h-[100svh] bg-background flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-4 bg-background/90 backdrop-blur-sm border-b border-border/50"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold">Appearance</h1>
          <p className="text-xs text-muted-foreground">Themes, colours &amp; font size</p>
        </div>
      </motion.header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 max-w-2xl w-full mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <AppearanceTab />
        </motion.div>
      </div>
    </div>
  );
}
