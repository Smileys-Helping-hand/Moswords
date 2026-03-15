'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, HelpCircle, MessageSquare, Shield, ExternalLink } from 'lucide-react';

const faqs = [
  {
    q: 'How do I start a new chat?',
    a: 'Tap Chats at the bottom, then tap the compose icon in the top right to start a new conversation.',
  },
  {
    q: 'How do I create a group chat?',
    a: 'In the Chats tab, switch to the Groups tab and tap "Create Group". Add members and give your group a name.',
  },
  {
    q: 'How do I mute a conversation?',
    a: 'Long press or tap the three-dot menu on any conversation in your chat list and select Mute.',
  },
  {
    q: 'Are my messages encrypted?',
    a: 'Yes — messages are end-to-end encrypted using AES-256-GCM. Only you and the recipient can read them.',
  },
  {
    q: 'How do I change my profile picture?',
    a: 'Go to More → Profile, then tap your avatar to upload a new photo.',
  },
  {
    q: 'How do I delete a message?',
    a: 'Long press on any message you sent to reveal the delete option.',
  },
  {
    q: 'How do I join a server?',
    a: 'Tap the Servers tab in the bottom navigation, then Browse All to explore public servers.',
  },
];

export default function HelpPage() {
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
          <h1 className="text-lg font-bold">Help</h1>
          <p className="text-xs text-muted-foreground">FAQ &amp; support</p>
        </div>
      </motion.header>

      <div className="flex-1 overflow-y-auto p-4 max-w-2xl w-full mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-4">

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
            Frequently asked questions
          </p>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.04 }}
                className="glass-card rounded-2xl border border-white/10 p-4"
              >
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{faq.q}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-2">
            Contact &amp; Support
          </p>
          <div className="glass-card rounded-2xl border border-white/10 px-4 divide-y divide-white/10">
            <div className="flex items-center gap-4 py-4">
              <MessageSquare className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm">Contact support</p>
                <p className="text-xs text-muted-foreground">support@moswords.app</p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-4 py-4">
              <Shield className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm">Privacy Policy</p>
                <p className="text-xs text-muted-foreground">How we handle your data</p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
