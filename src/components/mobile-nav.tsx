'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Home, MessageSquare, Settings, Menu, Inbox } from 'lucide-react';
import { useState } from 'react';

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

  const handleNavigate = (href: string | null) => {
    if (href) {
      router.push(href);
      setShowMenu(false);
    }
  };

  const isActive = (href: string | null) => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <>
      {/* Mobile Bottom Navigation - Only visible on screens < 768px */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden z-40 bg-gradient-to-t from-background via-background to-transparent border-t border-white/10 backdrop-blur-xl safe-area-bottom">
        <div className="flex justify-around items-center h-20 px-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.href)}
              className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all ${
                item.href && isActive(item.href)
                  ? 'bg-accent text-white'
                  : 'text-muted-foreground hover:bg-white/10'
              }`}
              aria-label={item.label}
            >
              <item.icon className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* More Menu Dropdown (shown when More is tapped) */}
      {showMenu && (
        <div className="fixed inset-0 md:hidden z-30 bg-black/50 backdrop-blur-sm" onClick={() => setShowMenu(false)}>
          <div className="absolute bottom-24 right-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 p-2 space-y-1">
            <button
              onClick={() => { router.push('/profile'); setShowMenu(false); }}
              className="w-full text-left px-4 py-2 hover:bg-white/10 rounded-lg transition-colors text-sm"
            >
              Profile
            </button>
            <button
              onClick={() => { router.push('/servers'); setShowMenu(false); }}
              className="w-full text-left px-4 py-2 hover:bg-white/10 rounded-lg transition-colors text-sm"
            >
              Servers
            </button>
            <button
              onClick={() => { router.push('/servers'); setShowMenu(false); }}
              className="w-full text-left px-4 py-2 hover:bg-white/10 rounded-lg transition-colors text-sm"
            >
              Settings
            </button>
          </div>
        </div>
      )}
    </>
  );
}
