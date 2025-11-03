import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useRealtime } from '../hooks/useRealtime';
import { ChatComposer } from '../features/chat/ChatComposer';
import { MessageList } from '../features/chat/MessageList';
import { AIPanel } from '../features/chat/AIPanel';

export interface ChatMessage {
  _id: string;
  content: string;
  senderId: string;
  createdAt: string;
}

export const ChatPage: React.FC = () => {
  const { channelId } = useParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const socket = useRealtime();

  useEffect(() => {
    if (!channelId) return;
    const fetchMessages = async () => {
      try {
        const { data } = await api.get(`/channels/${channelId}/messages`);
        setMessages(data.messages);
      } catch (error) {
        setMessages([]);
      }
    };
    fetchMessages();
  }, [channelId]);

  useEffect(() => {
    if (!socket || !channelId) return;
    socket.emit('channel:join', { channelId });
    const onMessage = (event: { message: ChatMessage }) => {
      setMessages((prev) => [...prev, event.message]);
    };
    socket.on('channel:message', onMessage);
    return () => {
      socket.off('channel:message', onMessage);
    };
  }, [socket, channelId]);

  if (!channelId) {
    return <div className="flex h-full items-center justify-center text-slate-400">Select a channel to start chatting.</div>;
  }

  const context = messages.map((message) => `${message.senderId}: ${message.content}`).join('\n');

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="flex h-full flex-1 flex-col">
        <MessageList messages={messages} />
        <ChatComposer channelId={channelId!} onMessage={(message) => setMessages((prev) => [...prev, message])} />
      </div>
      <div className="w-full border-t border-slate-800 bg-slate-900/60 p-4 lg:w-80 lg:border-l lg:border-t-0">
        <AIPanel context={context} />
      </div>
    </div>
  );
};
