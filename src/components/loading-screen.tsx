"use client";

import { motion } from 'framer-motion';
import { MoswordsIcon } from './icons';

export default function LoadingScreen() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background relative overflow-hidden">
      {/* Animated ambient gradient backdrops */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-cyan-500/20 via-purple-600/15 to-transparent rounded-full blur-[100px]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Orbital glow container */}
        <div className="relative flex items-center justify-center">
          {/* Rotating orbital ring */}
          <motion.div
            className="absolute w-28 h-28 rounded-full border border-dashed border-cyan-400/40"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute w-32 h-32 rounded-full border border-purple-500/20"
            animate={{ rotate: -360 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          />

          {/* Central Logo Badge */}
          <motion.div
            className="relative w-20 h-20 rounded-2xl bg-neutral-950/90 border border-white/10 flex items-center justify-center shadow-[0_0_35px_rgba(0,240,255,0.3)] backdrop-blur-2xl"
            animate={{
              scale: [0.97, 1.03, 0.97],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <MoswordsIcon className="w-12 h-12 text-white drop-shadow-[0_0_12px_rgba(0,240,255,0.6)]" />
          </motion.div>
        </div>

        <div className="text-center space-y-2">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent">
              Moswords
            </h2>
            <p className="text-xs text-neutral-400 font-medium tracking-wider uppercase mt-0.5">
              Second Brain Ecosystem
            </p>
          </motion.div>

          <motion.div
            className="flex gap-1.5 justify-center items-center pt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full"
                animate={{
                  scale: [1, 1.6, 1],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

