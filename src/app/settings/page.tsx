'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import UserAvatar from '@/components/user-avatar';
import {
  ArrowLeft,
  Shield,
  MessageSquare,
  Bell,
  HelpCircle,
  Info,
  ChevronRight,
  User,
  LogOut,
} from 'lucide-react';
import { signOut } from 'next-auth/react';

const sections = [
  {
    items: [
      { icon: MessageSquare, label: 'Chats', description: 'Theme, wallpaper, chat history', href: '/settings/chats', color: 'text-green-400' },
      { icon: Shield, label: 'Privacy', description: 'Read receipts, last seen, blocked', href: '/settings/privacy', color: 'text-blue-400' },
      { icon: Bell, label: 'Notifications', description: 'Message, group and call tones', href: '/profile', color: 'text-yellow-400' },
    ],
  },
  {
    items: [
      { icon: HelpCircle, label: 'Help', description: 'FAQ, contact us, privacy policy', href: '/profile', color: 'text-muted-foreground' },
      { icon: Info, label: 'About', description: 'Moswords', href: '/profile', color: 'text-muted-foreground' },
    ],
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const { session } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-20 glass-panel border-b border-border/40 flex items-center gap-3 px-4 py-3"
      >
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold flex-1">Settings</h1>
      </motion.div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Profile strip */}
        <button
          onClick={() => router.push('/profile')}
          className="w-full glass-card rounded-2xl border border-white/10 p-4 flex items-center gap-4 hover:bg-white/5 transition-colors"
        >
          <UserAvatar
            src={session?.user?.image || ''}
            fallback={(session?.user?.name || 'U').substring(0, 2).toUpperCase()}
            size="lg"
          />
          <div className="flex-1 min-w-0 text-left">
            <p className="font-semibold truncate">{session?.user?.name || 'Your name'}</p>
            <p className="text-sm text-muted-foreground truncate">{session?.user?.email}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </button>

        {sections.map((section, si) => (
          <div key={si} className="glass-card rounded-2xl border border-white/10 px-1 divide-y divide-white/10">
            {section.items.map((item) => (
              <button
                key={item.href + item.label}
                onClick={() => router.push(item.href)}
                className="w-full flex items-center gap-4 px-3 py-4 hover:bg-white/5 rounded-xl transition-colors"
              >
                <div className={`w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center shrink-0 ${item.color}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        ))}

        {/* Sign out */}
        <div className="glass-card rounded-2xl border border-white/10">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-4 px-4 py-4 hover:bg-red-500/10 rounded-2xl transition-colors text-red-400"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="font-medium text-sm">Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
