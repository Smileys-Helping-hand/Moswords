"use client";

import { createContext, useContext, ReactNode } from 'react';
import { useChat } from '@/hooks/use-chat';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ChatContextType {
  sendMessage: (content: string, mediaUrl?: string, mediaType?: 'image' | 'video' | 'audio' | 'file') => Promise<void>;
  channelId: string | null;
}

const ChatContext = createContext<ChatContextType>({
  sendMessage: async () => {},
  channelId: null,
});

export const useChatContext = () => useContext(ChatContext);

export function ChatProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);

  // Extract channelId from URL
  useEffect(() => {
    const channelMatch = pathname?.match(/\/channels\/([^\/]+)/);
    if (channelMatch) {
      setActiveChannelId(channelMatch[1]);
    } else {
      setActiveChannelId(null);
    }
  }, [pathname]);

  const { sendMessage } = useChat({ 
    channelId: activeChannelId,
    enabled: !!activeChannelId 
  });

  return (
    <ChatContext.Provider value={{ sendMessage, channelId: activeChannelId }}>
      {children}
    </ChatContext.Provider>
  );
}
