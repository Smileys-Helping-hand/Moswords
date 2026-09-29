# 🔔 Real-Time Notification System Documentation

## Overview

A comprehensive notification system that brings your chat application to life with **sound alerts**, **visual badges**, and **toast notifications**. Works globally across all pages, ensuring you never miss a message!

---

## 🎯 Features

### ✅ Sound Notifications
- 🔊 Plays `notification.mp3` on new messages
- 🎚️ Volume control (0.0 to 1.0)
- ⏯️ Enable/disable functionality
- 🛡️ Graceful error handling

### ✅ Visual Badges
- 🔴 Red pulsing dot for unread messages
- 🔢 Count badge for multiple unreads (shows "99+" for 100+)
- ✨ Smooth animations (scale, pulse, fade)
- 📍 Appears on:
  - Server icons (ServerSidebar)
  - Channel names (ChannelSidebar)
  - "Friends & DMs" button
  - Group chat icons

### ✅ Toast Notifications
- 📢 Shows sender name and message preview
- ⏱️ Auto-dismisses after 5 seconds
- 🎨 Uses your existing toast system (shadcn/ui)
- 💬 Truncates long messages (100 chars max)

### ✅ Smart Filtering
Only notifies when:
- ✅ Message is from someone else (not you)
- ✅ You're not currently viewing that conversation
- ✅ Message hasn't been notified already
- ✅ You're authenticated

---

## 🏗️ Architecture

### Components Created

| Component | Purpose | Location |
|-----------|---------|----------|
| **NotificationManager** | Global polling & notification logic | `src/components/notification-manager.tsx` |
| **UnreadProvider** | Context for tracking unread messages | `src/providers/unread-provider.tsx` |
| **UnreadBadge** | Animated badge component | `src/components/unread-badge.tsx` |
| **SoundEngine** | Singleton for playing sounds | `src/lib/sound-engine.ts` |
| **Notifications API** | Fetch new messages endpoint | `src/app/api/notifications/messages/route.ts` |

### How It Works

```
┌─────────────────────────────────────────────────────────┐
│                    User Action                          │
│               (New message sent)                        │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│            NotificationManager                          │
│         (Polls every 5 seconds)                         │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│        GET /api/notifications/messages                  │
│    ?since=2026-02-06T15:00:00&type=channel             │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│              Filter Messages                            │
│  • Not from current user?                               │
│  • Not viewing this chat?                               │
│  • Not already notified?                                │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│               Trigger Notifications                     │
│  1. soundEngine.play() → 🔊                             │
│  2. toast({ title, description }) → 📢                  │
│  3. addUnread(type, id) → 🔴                           │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 API Endpoints

### `GET /api/notifications/messages`

Fetch new messages since a given timestamp.

**Query Parameters:**
- `since` (required): ISO timestamp (e.g., `2026-02-06T15:00:00Z`)
- `type` (optional): `'channel' | 'dm' | 'group'`

**Response:**
```json
{
  "messages": [
    {
      "id": "msg-123",
      "content": "Hello world!",
      "userId": "user-456",
      "channelId": "channel-789",
      "createdAt": "2026-02-06T15:05:00Z",
      "user": {
        "id": "user-456",
        "displayName": "John Doe",
        "name": "John"
      }
    }
  ]
}
```

**Security:**
- ✅ Requires authentication (session check)
- ✅ Only returns messages user has access to
- ✅ Filters by receiver for DMs

---

## 🎨 UnreadProvider Context

### Methods

```typescript
const { 
  unreadChannels,      // Map<channelId, count>
  unreadDMs,           // Map<userId, count>
  unreadGroupChats,    // Map<groupChatId, count>
  markAsRead,          // (type, id) => void
  addUnread,           // (type, id, count) => void
  getTotalUnread,      // () => number
} = useUnread();
```

### Usage Example

```tsx
import { useUnread } from '@/providers/unread-provider';

function MyComponent() {
  const { unreadChannels, markAsRead } = useUnread();
  
  // Get unread count for a channel
  const count = unreadChannels.get('channel-123');
  
  // Mark as read when user views the channel
  useEffect(() => {
    markAsRead('channel', 'channel-123');
  }, []);
  
  return <span>{count} unread</span>;
}
```

---

## 🔊 SoundEngine API

### Methods

```typescript
import { soundEngine } from '@/lib/sound-engine';

// Play notification sound
await soundEngine.play();

// Set volume (0.0 to 1.0)
soundEngine.setVolume(0.5);

// Enable/disable
soundEngine.setEnabled(false);

// Check if enabled
const enabled = soundEngine.isEnabled();

// Test sound
await soundEngine.test();
```

### Singleton Pattern
- Only one instance exists globally
- Preloads audio for instant playback
- Clones audio node for multiple simultaneous plays

---

## 🎯 UnreadBadge Component

### Props

```typescript
interface UnreadBadgeProps {
  count?: number;        // Number to display (99+ max)
  show?: boolean;        // Force show dot even without count
  size?: 'sm' | 'md' | 'lg';  // Badge size
  className?: string;    // Additional CSS classes
}
```

### Usage

```tsx
import UnreadBadge from '@/components/unread-badge';

// Show count badge
<UnreadBadge count={5} size="md" />

// Show red dot without count
<UnreadBadge show={true} size="sm" />

// Auto-hide when count is 0
<UnreadBadge count={unreadCount} />
```

### Animations
- ✨ Scale in/out on mount/unmount
- 💓 Pulsing effect every 2 seconds
- 🌊 Smooth transitions

---

## 📦 Integration Guide

### Step 1: Upload Notification Sound

Place your `notification.mp3` file in:
```
/public/sounds/notification.mp3
```

**Recommendations:**
- Duration: 0.5-2 seconds
- Format: MP3
- Size: < 100KB
- Normalized volume

### Step 2: Verify Layout Setup

Ensure your `layout.tsx` includes:
```tsx
import { UnreadProvider } from '@/providers/unread-provider';
import NotificationManager from '@/components/notification-manager';

<AuthProvider>
  <UnreadProvider>
    {children}
    <NotificationManager />
  </UnreadProvider>
</AuthProvider>
```

### Step 3: Add Badges to Your Components

```tsx
import { useUnread } from '@/providers/unread-provider';
import UnreadBadge from '@/components/unread-badge';

function MyChannelList() {
  const { unreadChannels } = useUnread();
  
  return channels.map(channel => (
    <div className="relative">
      <ChannelItem channel={channel} />
      <UnreadBadge count={unreadChannels.get(channel.id)} />
    </div>
  ));
}
```

### Step 4: Mark as Read

When user views a conversation:
```tsx
import { useUnread } from '@/providers/unread-provider';
import { usePathname } from 'next/navigation';

function ChatView({ channelId }: { channelId: string }) {
  const { markAsRead } = useUnread();
  const pathname = usePathname();
  
  useEffect(() => {
    // Mark as read when user enters this view
    markAsRead('channel', channelId);
  }, [channelId, pathname]);
  
  return <ChatMessages />;
}
```

---

## 🔧 Configuration

### Polling Interval

Edit `NotificationManager.tsx`:
```typescript
// Change from 5000ms (5s) to your preferred interval
pollingIntervalRef.current = setInterval(checkForNewMessages, 5000);
```

### Notification Duration

Edit toast duration in `NotificationManager.tsx`:
```typescript
toast({
  title: notificationTitle,
  description: message.content,
  duration: 5000, // Change this (milliseconds)
});
```

### Sound Volume

Adjust globally:
```typescript
import { soundEngine } from '@/lib/sound-engine';
soundEngine.setVolume(0.3); // 30% volume
```

---

## 🚀 Upgrading to WebSocket/Pusher

The current system uses **polling** (checks every 5 seconds). To upgrade to real-time:

### Replace Polling with WebSocket

```typescript
// Instead of setInterval:
const socket = new WebSocket('wss://your-server.com');

socket.on('message_received', (message) => {
  showNotification(message);
});
```

### Use Pusher

```typescript
import Pusher from 'pusher-js';

const pusher = new Pusher('your-app-key', {
  cluster: 'your-cluster',
});

const channel = pusher.subscribe(`user-${currentUserId}`);
channel.bind('message_received', (message) => {
  showNotification(message);
});
```

All notification logic (`showNotification`, filters, badges) remains the same!

---

## 🧪 Testing

### Test Notification Sound

Open browser console:
```javascript
import { soundEngine } from '@/lib/sound-engine';
soundEngine.test();
```

### Test Notifications

1. Open app in two browser windows
2. Log in as different users
3. Send a message from User A
4. User B should:
   - 🔊 Hear the sound
   - 📢 See a toast notification
   - 🔴 See a badge on the conversation

### Test Badge Clearing

1. See a badge on a conversation
2. Click to view that conversation
3. Badge should disappear immediately

---

## 📊 Performance Notes

### Polling Frequency
- **Current:** 5 seconds
- **Impact:** Minimal (lightweight API calls)
- **Network:** ~12 requests/minute per user

### Optimization Tips
1. **Increase interval** for high-user environments (10-15s)
2. **Batch queries** (already implemented - 3 types in parallel)
3. **Upgrade to WebSocket** for instant notifications
4. **Use service workers** for background notifications

### Memory Management
- NotificationManager tracks last 100 notified messages
- Older tracked messages are automatically pruned
- No memory leaks from infinite growth

---

## 🎉 What's Working Now

✅ **Global notifications** - Work on any page  
✅ **Sound alerts** - Play for new messages  
✅ **Toast notifications** - Show sender & preview  
✅ **Visual badges** - Animated unread indicators  
✅ **Smart filtering** - Only notify when relevant  
✅ **DM tracking** - Separate counters for each conversation  
✅ **Channel tracking** - Per-channel unread counts  
✅ **Group chat support** - Ready for group messages  
✅ **Auto mark-as-read** - Clears when viewing conversation  

---

## 🔮 Future Enhancements

- [ ] Browser notifications (Notification API)
- [ ] Custom notification sounds per conversation
- [ ] Notification history/inbox
- [ ] Do-not-disturb mode
- [ ] Notification scheduling (quiet hours)
- [ ] Per-conversation notification settings
- [ ] Desktop app integration
- [ ] Mobile push notifications

---

## 🐛 Troubleshooting

### Sound Not Playing

**Check:**
1. File exists at `/public/sounds/notification.mp3`
2. Browser allows audio (user must interact first)
3. Sound is enabled: `soundEngine.isEnabled()`
4. Volume is not 0: `soundEngine.setVolume(0.5)`

**Fix:**
```javascript
// Test in console
soundEngine.test();
```

### Notifications Not Showing

**Check:**
1. User is authenticated (`session?.user`)
2. NotificationManager is mounted in layout
3. API endpoint returns messages
4. Messages are from other users (not self)

**Debug:**
```typescript
// Add console.logs in NotificationManager
console.log('Messages received:', data.messages);
```

### Badges Not Updating

**Check:**
1. UnreadProvider wraps your app
2. Components use `useUnread()` hook
3. `markAsRead()` is called when viewing

**Fix:**
```typescript
const { markAsRead } = useUnread();
useEffect(() => {
  markAsRead('channel', channelId);
}, [channelId]);
```

---

Happy notifying! 🎉🔔
