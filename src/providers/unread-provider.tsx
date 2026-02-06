"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface UnreadMessage {
  channelId?: string;
  conversationId?: string;
  groupChatId?: string;
  count: number;
  lastMessageAt: Date;
}

interface UnreadContextType {
  unreadChannels: Map<string, number>;
  unreadDMs: Map<string, number>;
  unreadGroupChats: Map<string, number>;
  markAsRead: (type: 'channel' | 'dm' | 'group', id: string) => void;
  addUnread: (type: 'channel' | 'dm' | 'group', id: string, count?: number) => void;
  getTotalUnread: () => number;
  refreshUnreads: () => Promise<void>;
}

const UnreadContext = createContext<UnreadContextType | undefined>(undefined);

export function UnreadProvider({ children }: { children: React.ReactNode }) {
  const [unreadChannels, setUnreadChannels] = useState<Map<string, number>>(new Map());
  const [unreadDMs, setUnreadDMs] = useState<Map<string, number>>(new Map());
  const [unreadGroupChats, setUnreadGroupChats] = useState<Map<string, number>>(new Map());

  const markAsRead = useCallback((type: 'channel' | 'dm' | 'group', id: string) => {
    switch (type) {
      case 'channel':
        setUnreadChannels(prev => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
        break;
      case 'dm':
        setUnreadDMs(prev => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
        break;
      case 'group':
        setUnreadGroupChats(prev => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
        break;
    }
  }, []);

  const addUnread = useCallback((type: 'channel' | 'dm' | 'group', id: string, count: number = 1) => {
    switch (type) {
      case 'channel':
        setUnreadChannels(prev => {
          const next = new Map(prev);
          next.set(id, (prev.get(id) || 0) + count);
          return next;
        });
        break;
      case 'dm':
        setUnreadDMs(prev => {
          const next = new Map(prev);
          next.set(id, (prev.get(id) || 0) + count);
          return next;
        });
        break;
      case 'group':
        setUnreadGroupChats(prev => {
          const next = new Map(prev);
          next.set(id, (prev.get(id) || 0) + count);
          return next;
        });
        break;
    }
  }, []);

  const getTotalUnread = useCallback(() => {
    let total = 0;
    unreadChannels.forEach(count => total += count);
    unreadDMs.forEach(count => total += count);
    unreadGroupChats.forEach(count => total += count);
    return total;
  }, [unreadChannels, unreadDMs, unreadGroupChats]);

  const refreshUnreads = useCallback(async () => {
    // This will be called by NotificationManager
    // For now, it's a placeholder that can be implemented later
  }, []);

  return (
    <UnreadContext.Provider
      value={{
        unreadChannels,
        unreadDMs,
        unreadGroupChats,
        markAsRead,
        addUnread,
        getTotalUnread,
        refreshUnreads,
      }}
    >
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnread() {
  const context = useContext(UnreadContext);
  if (!context) {
    throw new Error('useUnread must be used within UnreadProvider');
  }
  return context;
}
