'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'primary';
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
}: EmptyStateProps) {
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  return (
    <motion.div
      className="flex flex-col items-center justify-center h-full text-center select-none gap-6 px-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Icon Container */}
      <motion.div
        className={`relative w-32 h-32 rounded-full flex items-center justify-center ${
          variant === 'primary'
            ? 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-400/30 neon-glow'
            : 'bg-white/5 border border-white/10'
        }`}
        variants={itemVariants}
        animate={{
          y: [0, -10, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div className="text-5xl opacity-60">{icon}</div>
      </motion.div>

      {/* Title */}
      <motion.h2
        className="text-2xl font-semibold text-foreground"
        variants={itemVariants}
      >
        {title}
      </motion.h2>

      {/* Description */}
      <motion.p
        className="text-sm text-muted-foreground max-w-sm leading-relaxed"
        variants={itemVariants}
      >
        {description}
      </motion.p>

      {/* Action Button */}
      {action && (
        <motion.div variants={itemVariants} className="mt-4">
          <Button
            onClick={action.onClick}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white neon-glow shadow-lg px-6"
          >
            {action.label}
          </Button>
        </motion.div>
      )}

      {/* Decorative elements */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 0.5, duration: 1 }}
      >
        <div className="absolute top-20 left-1/4 w-24 h-24 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
      </motion.div>
    </motion.div>
  );
}
