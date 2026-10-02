"use client";

import { Suspense } from "react";
import AuthForm from "@/components/auth-form";
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Smartphone } from 'lucide-react';
import { MoswordsIcon } from '@/components/icons';

export default function LoginPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-primary/5 to-accent/5 p-4 relative pb-24 md:pb-0">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
                <motion.div 
                    className="absolute top-20 left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl"
                    animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{ duration: 8, repeat: Infinity }}
                />
                <motion.div 
                    className="absolute bottom-20 right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl"
                    animate={{ 
                        scale: [1.2, 1, 1.2],
                        opacity: [0.5, 0.3, 0.5]
                    }}
                    transition={{ duration: 8, repeat: Infinity, delay: 1 }}
                />
            </div>
            
            <motion.div 
                className="w-full max-w-md relative z-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <motion.div 
                    className="flex flex-col items-center mb-6 gap-3"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                >
                    <motion.div
                        className="relative w-20 h-20 rounded-3xl bg-neutral-950/80 border border-white/15 flex items-center justify-center shadow-[0_0_40px_rgba(0,240,255,0.35)] backdrop-blur-xl"
                        whileHover={{ scale: 1.08 }}
                        transition={{ type: "spring", stiffness: 400, damping: 12 }}
                    >
                        <MoswordsIcon className="w-13 h-13 text-white drop-shadow-[0_0_12px_rgba(0,240,255,0.5)]" />
                    </motion.div>
                    <div className="text-center space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px] font-medium tracking-wide uppercase">
                            <span>Second Brain Ecosystem</span>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent">
                            Welcome to Moswords
                        </h1>
                        <p className="text-sm text-muted-foreground">Fast, private messaging, voice and team workspaces.</p>
                    </div>
                </motion.div>
                
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Suspense fallback={null}>
                        <AuthForm />
                    </Suspense>
                    <Link
                        href="/download"
                        className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary"
                    >
                        <Smartphone className="w-4 h-4" /> Get the Moswords app for your phone
                    </Link>
                </motion.div>
            </motion.div>
        </div>
    );
}

