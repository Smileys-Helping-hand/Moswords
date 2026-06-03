'use client';

import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageCircle, Zap, Mail, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter, usePathname } from 'next/navigation';

interface AppConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  url: string;
  color: string;
}

const APPS: AppConfig[] = [
  {
    id: 'moswords',
    name: 'Moswords',
    icon: <MessageCircle className="w-5 h-5" />,
    url: '/dm',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    id: 'nexus',
    name: 'Nexus Gaming',
    icon: <Zap className="w-5 h-5" />,
    url: 'https://nexus.savestate.co.za',
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'email',
    name: 'Email Orca',
    icon: <Mail className="w-5 h-5" />,
    url: 'https://email.savestate.co.za',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'brain',
    name: 'Second Brain',
    icon: <Brain className="w-5 h-5" />,
    url: 'https://savestate.co.za',
    color: 'from-orange-500 to-red-500',
  },
];

export default function AppLauncher() {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (url: string) => {
    if (url.startsWith('http')) return false;
    return pathname.startsWith(url);
  };

  const handleAppClick = (app: AppConfig) => {
    if (app.url.startsWith('http')) {
      window.open(app.url, '_blank');
    } else {
      router.push(app.url);
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <nav className="w-20 glass-panel flex flex-col items-center py-4 gap-4 z-30 border-r border-white/5 h-screen">
        {APPS.map((app, index) => {
          const active = isActive(app.url);

          return (
            <Tooltip key={app.id}>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative group"
                >
                  {/* Glowing active indicator */}
                  {active && (
                    <motion.div
                      className="absolute -right-3 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-gradient-to-b from-cyan-400 to-cyan-500 rounded-l-full neon-glow"
                      layoutId="active-indicator"
                    />
                  )}

                  <Button
                    onClick={() => handleAppClick(app)}
                    className={`w-12 h-12 rounded-2xl transition-all duration-300 ${
                      active
                        ? `bg-gradient-to-br ${app.color} text-white neon-glow shadow-lg`
                        : 'bg-white/5 text-foreground hover:bg-white/10 hover:neon-glow'
                    }`}
                    variant="ghost"
                    size="icon"
                  >
                    {app.icon}
                  </Button>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-neutral-800 border border-white/10">
                <p className="text-sm font-medium">{app.name}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom accent indicator */}
        <motion.div
          className="w-8 h-0.5 bg-gradient-to-r from-cyan-400 to-transparent rounded-full"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </nav>
    </TooltipProvider>
  );
}
