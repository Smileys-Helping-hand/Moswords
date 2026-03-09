'use client';

import { useRouter, usePathname } from 'next/navigation';
import { MessageSquare, Menu, Inbox, Server, User, Settings, LogOut, X, Radio } from 'lucide-react';

import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import UserAvatar from './user-avatar';
import { useAuth } from '@/hooks/use-auth';
import { useMobileFeatures } from '@/hooks/use-mobile-features';

const navItems = [
  { id: 'messages', label: 'Chats', icon: MessageSquare, href: '/dm' },
  { id: 'updates', label: 'Updates', icon: Radio, href: '/updates' },
  { id: 'servers', label: 'Servers', icon: Server, href: '/servers' },
  { id: 'more', label: 'More', icon: Menu, href: null },
];

export default function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [showMenu, setShowMenu] = useState(false);
  const { session } = useAuth();
  const { haptic, isNative } = useMobileFeatures();

  // Close menu on route change
  useEffect(() => {
    setShowMenu(false);
  }, [pathname]);

  const handleNavigate = (href: string | null) => {
    // Haptic feedback on tap
    haptic.light();
    
    if (href) {
      router.push(href);
      setShowMenu(false);
    } else {
      // This is the "More" button
      setShowMenu(!showMenu);
    }
  };

  const isActive = (href: string | null) => {
    if (!href) return showMenu;
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <>
      {/* Mobile Bottom Navigation - Only visible on screens < 768px */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden z-40 bg-background/90 border-t border-border/60 backdrop-blur-2xl safe-area-bottom shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.3)]">
        <div className="flex justify-around items-end h-16 px-2 pb-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.href)}
                className="flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all relative"
                aria-label={item.label}
              >
                {/* Active indicator glow pill */}
                {active && (
                  <motion.div
                    layoutId="nav-active-pill"
                    className="absolute inset-x-1 inset-y-1 rounded-xl bg-primary/15 border border-primary/25"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <item.icon
                  className={`w-5 h-5 mb-0.5 relative z-10 transition-all duration-150 ${
                    active ? 'text-primary scale-110 drop-shadow-[0_0_6px_hsl(var(--primary)/0.6)]' : 'text-muted-foreground'
                  }`}
                />
                <span
                  className={`text-[10px] font-semibold relative z-10 transition-colors duration-150 ${
                    active ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {item.label}
                </span>
                {/* Active dot */}
                {active && (
                  <motion.span
                    layoutId="nav-active-dot"
                    className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* More Menu Overlay */}
      <AnimatePresence>
        {showMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 md:hidden z-30 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowMenu(false)}
            />
            
            {/* Menu Panel */}
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-20 left-4 right-4 md:hidden z-40 glass-panel rounded-2xl border border-white/20 overflow-hidden"
            >
              {/* User Info Header */}
              <div className="p-4 border-b border-white/10 flex items-center gap-3">
                <UserAvatar
                  src={session?.user?.image || ''}
                  fallback={(session?.user?.name || session?.user?.email || 'U').substring(0, 2).toUpperCase()}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{session?.user?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
                </div>
                <button
                  onClick={() => setShowMenu(false)}
                  className="p-2 hover:bg-white/10 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Menu Items */}
              <div className="p-2">
                <button
                  onClick={() => { router.push('/profile'); setShowMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <User className="w-5 h-5 text-primary" />
                  <span className="font-medium">Profile</span>
                </button>
                
                <button
                  onClick={() => { router.push('/nexusmail'); setShowMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <Inbox className="w-5 h-5 text-primary" />
                  <span className="font-medium">Inbox</span>
                </button>
                
                <button
                  onClick={() => { router.push('/settings'); setShowMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <Settings className="w-5 h-5 text-primary" />
                  <span className="font-medium">Settings</span>
                </button>
                
                <div className="border-t border-white/10 my-2" />
                
                <button
                  onClick={() => { signOut({ callbackUrl: '/login' }); setShowMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/20 rounded-xl transition-colors text-red-400"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
