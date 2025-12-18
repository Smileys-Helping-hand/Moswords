import { mockMessages, mockChannels } from '@/lib/placeholder-data';
import ChatMessage from './chat-message';
import { Hash } from 'lucide-react';

export default function ChatMessages() {
  const currentChannel = mockChannels[0];

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center">
            <Hash className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
            <h2 className="text-3xl font-bold">Welcome to #{currentChannel.name}!</h2>
            <p className="text-muted-foreground">This is the start of the #{currentChannel.name} channel.</p>
        </div>
      </div>

      {mockMessages.map((msg, index) => (
        <ChatMessage 
          key={msg.id} 
          message={msg}
          showAvatar={index === 0 || mockMessages[index - 1].author.id !== msg.author.id}
        />
      ))}
      <div className="h-4" />
    </div>
  );
}
