import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessage } from '../../pages/ChatPage';

interface MessageListProps {
  messages: ChatMessage[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => (
  <div className="flex-1 overflow-y-auto p-6">
    <div className="space-y-4">
      <AnimatePresence initial={false}>
        {messages.map((message) => (
          <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            key={message._id}
            className="rounded border border-slate-800 bg-slate-900/60 p-4 text-sm"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>User {message.senderId}</span>
              <span>{message.createdAt ? new Date(message.createdAt).toLocaleTimeString() : 'now'}</span>
            </div>
            <p className="mt-2 text-slate-100">{message.content}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  </div>
);
