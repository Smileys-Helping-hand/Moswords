import { useState } from 'react';
import { api } from '../../lib/api';
import type { ChatMessage } from '../../pages/ChatPage';

interface ChatComposerProps {
  channelId: string;
  onMessage: (message: ChatMessage) => void;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({ channelId, onMessage }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/channels/${channelId}/messages`, { content });
      onMessage(data.message);
      setContent('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-slate-800 bg-slate-900/60 p-4">
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Message #general"
        className="h-24 w-full resize-none rounded border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 focus:border-brand-500 focus:outline-none"
      />
      <div className="mt-3 flex justify-end">
        <button type="submit" disabled={loading} className="rounded bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50">
          Send
        </button>
      </div>
    </form>
  );
};
