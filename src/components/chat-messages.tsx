"use client";

import ChatMessage from './chat-message';
import { Hash } from 'lucide-react';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { Message, Channel } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { emitPermissionError } from '@/lib/firebase-error-handler';
import { FirestorePermissionError } from '@/lib/errors';

export default function ChatMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);

  // Assuming active channel is 1 for now, will need to be dynamic
  const activeChannelId = '1';

  useEffect(() => {
    setLoading(true);

    const messagesQuery = query(
      collection(firestore, 'messages'),
      where('channelId', '==', activeChannelId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribeMessages = onSnapshot(messagesQuery, 
      (snapshot) => {
        const messagesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        setMessages(messagesData);
        setLoading(false);
      },
      (error) => {
        console.error("Chat messages listener failed:", error);
        emitPermissionError(new FirestorePermissionError({
          path: messagesQuery.path,
          operation: 'list'
        }));
        setLoading(false);
      }
    );

    const channelRef = doc(firestore, 'channels', activeChannelId);
    const unsubscribeChannel = onSnapshot(channelRef, 
      (doc) => {
        if(doc.exists()) {
            setCurrentChannel({ id: doc.id, ...doc.data()} as Channel);
        }
      },
      (error) => {
        console.error("Channel details listener failed:", error);
        emitPermissionError(new FirestorePermissionError({
          path: channelRef.path,
          operation: 'get'
        }));
      }
    );

    return () => {
      unsubscribeMessages();
      unsubscribeChannel();
    };
  }, [activeChannelId]);

  if (loading) {
    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="flex items-start gap-4">
                <Skeleton className="w-16 h-16 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-6 w-72" />
                </div>
            </div>
            <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-12 w-3/4" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-10 w-1/2" />
            </div>
        </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center">
            <Hash className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
            <h2 className="text-3xl font-bold">Welcome to #{currentChannel?.name}!</h2>
            <p className="text-muted-foreground">This is the start of the #{currentChannel?.name} channel.</p>
        </div>
      </div>

      {messages.map((msg, index) => (
        <ChatMessage 
          key={msg.id} 
          message={msg}
          showAvatar={index === 0 || messages[index - 1].author.uid !== msg.author.uid}
        />
      ))}
      <div className="h-4" />
    </div>
  );
}

    