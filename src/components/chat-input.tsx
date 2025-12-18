"use client"

import { PlusCircle, SendHorizonal } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

export default function ChatInput() {
  return (
    <div className="p-4 bg-background border-t border-border">
      <div className="relative">
        <Button variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2">
            <PlusCircle className="w-6 h-6" />
        </Button>
        <Input placeholder="Message #general" className="pl-12 pr-12 h-12 rounded-lg bg-card" />
        <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-accent">
            <SendHorizonal className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
