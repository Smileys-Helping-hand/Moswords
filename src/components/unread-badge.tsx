"use client";

import { motion, AnimatePresence } from 'framer-motion';

interface UnreadBadgeProps {
  count?: number;
  show?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function UnreadBadge({ 
  count, 
  show = true,
  size = 'sm',
  className = '' 
}: UnreadBadgeProps) {
  if (!show && !count) return null;

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const countSizeClasses = {
    sm: 'w-4 h-4 text-[8px]',
    md: 'w-5 h-5 text-[10px]',
    lg: 'w-6 h-6 text-xs',
  };

  return (
    <AnimatePresence>
      {(show || count) && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 500, 
            damping: 30 
          }}
          className={`absolute -top-1 -right-1 ${className}`}
        >
          {count && count > 0 ? (
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
              }}
              transition={{ 
                duration: 0.3,
                repeat: Infinity,
                repeatDelay: 2,
              }}
              className={`${countSizeClasses[size]} rounded-full bg-red-500 flex items-center justify-center font-bold text-white shadow-lg shadow-red-500/50`}
            >
              {count > 99 ? '99+' : count}
            </motion.div>
          ) : (
            <motion.div
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [1, 0.7, 1],
              }}
              transition={{ 
                duration: 1.5,
                repeat: Infinity,
              }}
              className={`${sizeClasses[size]} rounded-full bg-red-500 shadow-lg shadow-red-500/50`}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
