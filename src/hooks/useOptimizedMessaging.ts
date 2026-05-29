import { useCallback, useRef, useState, useEffect } from 'react';
import { useToast } from './use-toast';

/**
 * Optimized messaging hook for smooth, fast message sending
 * - Optimistic updates (show message immediately)
 * - Retry logic for failed messages
 * - Message batching
 * - Delivery tracking
 */
export function useOptimizedMessaging() {
  const { toast } = useToast();
  const [pendingMessages, setPendingMessages] = useState<Map<string, any>>(new Map());
  const batchQueue = useRef<any[]>([]);
  const batchTimer = useRef<NodeJS.Timeout | null>(null);

  // Optimistic message sending
  const sendMessageOptimistically = useCallback(
    async (
      receiverId: string,
      content: string,
      onOptimisticAdd: (msg: any) => void,
      onConfirm?: (serverMsg: any) => void,
      onError?: (error: any) => void
    ) => {
      // Create temporary message
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const tempMessage = {
        id: tempId,
        content,
        receiverId,
        status: 'sending',
        timestamp: new Date(),
        isOptimistic: true,
      };

      // Show immediately
      onOptimisticAdd(tempMessage);
      setPendingMessages((prev) => new Map(prev).set(tempId, tempMessage));

      try {
        // Send to server
        const response = await fetch('/api/direct-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ receiverId, content }),
        });

        if (!response.ok) throw new Error('Failed to send');

        const serverMessage = await response.json();

        // Update with server response
        setPendingMessages((prev) => {
          const next = new Map(prev);
          next.delete(tempId);
          return next;
        });

        onConfirm?.(serverMessage);
      } catch (error) {
        console.error('Message send failed:', error);

        // Update status to failed
        setPendingMessages((prev) => {
          const next = new Map(prev);
          const msg = next.get(tempId);
          if (msg) {
            msg.status = 'failed';
            next.set(tempId, msg);
          }
          return next;
        });

        onError?.(error);

        // Show retry option
        toast({
          title: 'Message failed',
          description: 'Tap to retry',
          action: {
            label: 'Retry',
            onClick: () => {
              // Retry the message
              sendMessageOptimistically(
                receiverId,
                content,
                onOptimisticAdd,
                onConfirm,
                onError
              );
            },
          },
        });
      }
    },
    [toast]
  );

  // Batch message operations
  const queueMessageOperation = useCallback((operation: any) => {
    batchQueue.current.push(operation);

    // Clear existing timer
    if (batchTimer.current) {
      clearTimeout(batchTimer.current);
    }

    // Set new timer (50ms batching window)
    batchTimer.current = setTimeout(() => {
      flushBatchQueue();
    }, 50);
  }, []);

  const flushBatchQueue = useCallback(() => {
    if (batchQueue.current.length === 0) return;

    const operations = batchQueue.current;
    batchQueue.current = [];

    // Process all operations in batch
    operations.forEach((op) => op());
  }, []);

  // Retry failed message
  const retryMessage = useCallback(
    async (messageId: string, onConfirm?: (msg: any) => void) => {
      const message = pendingMessages.get(messageId);
      if (!message) return;

      try {
        const response = await fetch('/api/direct-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiverId: message.receiverId,
            content: message.content,
          }),
        });

        if (!response.ok) throw new Error('Retry failed');

        const serverMessage = await response.json();

        setPendingMessages((prev) => {
          const next = new Map(prev);
          next.delete(messageId);
          return next;
        });

        onConfirm?.(serverMessage);

        toast({
          title: 'Message sent!',
          description: 'Your message was sent successfully.',
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Still failing',
          description: 'Check your connection and try again.',
        });
      }
    },
    [pendingMessages, toast]
  );

  return {
    sendMessageOptimistically,
    queueMessageOperation,
    flushBatchQueue,
    retryMessage,
    pendingMessages,
  };
}

/**
 * Typing indicator with debouncing
 */
export function useTypingIndicator() {
  const [isTyping, setIsTyping] = useState(false);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);

  const handleTyping = useCallback(() => {
    // Clear existing timer
    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
    }

    // Set typing
    if (!isTyping) {
      setIsTyping(true);
      // Notify server that user is typing
      fetch('/api/conversations/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTyping: true }),
      }).catch(() => {}); // Silently fail
    }

    // Stop typing after 3 seconds of inactivity
    typingTimer.current = setTimeout(() => {
      setIsTyping(false);
      // Notify server that user stopped typing
      fetch('/api/conversations/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTyping: false }),
      }).catch(() => {}); // Silently fail
    }, 3000);
  }, [isTyping]);

  useEffect(() => {
    return () => {
      if (typingTimer.current) {
        clearTimeout(typingTimer.current);
      }
    };
  }, []);

  return { isTyping, handleTyping };
}

/**
 * Message delivery status tracking
 */
export function useMessageDeliveryStatus() {
  const [messageStatus, setMessageStatus] = useState<
    Map<string, 'sending' | 'sent' | 'delivered' | 'read'>
  >(new Map());

  const updateStatus = useCallback(
    (messageId: string, status: 'sending' | 'sent' | 'delivered' | 'read') => {
      setMessageStatus((prev) => {
        const next = new Map(prev);
        next.set(messageId, status);
        return next;
      });
    },
    []
  );

  return { messageStatus, updateStatus };
}
