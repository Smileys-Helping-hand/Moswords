'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Home, MessageSquare, Menu, Inbox, User, Server, Settings, LogOut, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import UserAvatar from './user-avatar';
import { useAuth } from '@/hooks/use-auth';
import { useMobileFeatures } from '@/hooks/use-mobile-features';

const navItems = [
  { id: 'home', label: 'Home', icon: Home, href: '/' },
  { id: 'messages', label: 'Messages', icon: MessageSquare, href: '/dm' },
  { id: 'inbox', label: 'Inbox', icon: Inbox, href: '/nexusmail' },
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
      <nav className="fixed bottom-0 left-0 right-0 md:hidden z-40 bg-gradient-to-t from-background via-background/95 to-transparent border-t border-white/10 backdrop-blur-xl safe-area-bottom">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.href)}
              className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all ${
                isActive(item.href)
                  ? 'bg-accent text-white'
                  : 'text-muted-foreground hover:bg-white/10'
              }`}
              aria-label={item.label}
            >
              <item.icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
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
                  onClick={() => { router.push('/servers'); setShowMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <Server className="w-5 h-5 text-primary" />
                  <span className="font-medium">Servers</span>
                </button>
                
                <button
                  onClick={() => { router.push('/profile'); setShowMenu(false); }}
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
