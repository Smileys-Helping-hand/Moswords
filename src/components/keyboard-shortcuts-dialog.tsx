"use client";

import { motion } from 'framer-motion';
import { Keyboard } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

const shortcuts = [
  { keys: ['Ctrl', 'K'], description: 'Quick search' },
  { keys: ['Ctrl', 'N'], description: 'New message' },
  { keys: ['Ctrl', 'Shift', 'T'], description: 'Create thread' },
  { keys: ['Ctrl', '/'], description: 'Show keyboard shortcuts' },
  { keys: ['Ctrl', 'Enter'], description: 'Send message' },
  { keys: ['Ctrl', 'B'], description: 'Bold text' },
  { keys: ['Ctrl', 'I'], description: 'Italic text' },
  { keys: ['Ctrl', 'U'], description: 'Underline text' },
  { keys: ['Esc'], description: 'Close dialog' },
  { keys: ['↑', '↓'], description: 'Navigate messages' },
];

export default function KeyboardShortcutsDialog() {
  return (
    <Dialog>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button variant="ghost" size="icon" className="hover:text-primary hover:bg-white/10">
                  <Keyboard className="w-5 h-5" />
                </Button>
              </motion.div>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Keyboard Shortcuts</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="glass-card border-white/20 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-gradient flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Boost your productivity with these shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2 py-4">
          {shortcuts.map((shortcut, index) => (
            <motion.div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg glass-card hover:bg-white/5 transition-colors"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ x: 4 }}
            >
              <span className="text-sm text-foreground">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, i) => (
                  <div key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-xs text-muted-foreground">+</span>}
                    <kbd className="px-2 py-1 text-xs font-semibold rounded glass-card border border-white/20 min-w-[2rem] text-center">
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
