# 🔔 Push Notifications Guide

## Features Implemented

### ✅ What's New

1. **Service Worker Integration**
   - Full PWA support with offline caching
   - Background push notifications
   - Notification click handling
   - Background message sync

2. **Enhanced Notification System**
   - Browser push notifications
   - Mobile notification support
   - Sound and vibration alerts
   - Rich notification content with icons

3. **Improved Calling**
   - Better UI/UX for video and voice calls
   - Participant count display
   - Enhanced control buttons
   - Connection quality indicators

4. **UI Fixes**
   - Fixed channel name display issue (was showing "#!")
   - Improved mobile responsiveness
   - Better error handling

## How to Use

### Enable Notifications on Mobile

1. **Open the app in your mobile browser**
   - Chrome (Android) or Safari (iOS)

2. **Install as PWA (Progressive Web App)**
   - Tap the "Add to Home Screen" prompt
   - Or use browser menu → "Add to Home Screen"

3. **Grant notification permission**
   - When prompted, tap "Allow"
   - Or go to browser settings → Site permissions → Notifications

4. **Test notifications**
   - A test notification will appear after granting permission
   - New messages will trigger notifications when you're away from the chat

### Desktop Notifications

1. **Permission prompt**
   - Click "Allow" when prompted for notifications
   - Or click the 🔔 icon in the address bar

2. **Notifications will show**
   - When you're not viewing the specific channel/DM
   - With message preview and sender info
   - Click notification to open the conversation

## Technical Details

### Files Added/Modified

1. **`/public/sw.js`** - Service Worker
   - Caches resources for offline use
   - Handles push notifications
   - Manages background sync

2. **`/src/lib/notification-service.ts`** - Notification API
   - Unified notification interface
   - Permission management
   - Push subscription handling

3. **`/src/components/notification-manager.tsx`** - Updated
   - Uses new notification service
   - Better permission handling
   - Test notification on first enable

4. **`/src/components/chat-header.tsx`** - Fixed
   - Channel name now displays correctly
   - Added missing function closing brace

5. **`/public/manifest.json`** - Enhanced
   - Better PWA integration
   - More app shortcuts
   - Share target API support

6. **`/src/app/call/page.tsx`** - Improved
   - Better UI with glass morphism
   - Participant counter
   - Enhanced controls

## Notification Behavior

### When You'll Get Notified

✅ **You WILL receive notifications:**
- New messages in channels you're not viewing
- New direct messages
- New group chat messages
- When the app is in the background
- When the app is closed (on mobile PWA)

❌ **You WON'T receive notifications:**
- Messages in the channel you're currently viewing
- Your own messages
- When you explicitly dismiss notifications

### Notification Content

Each notification includes:
- **Title**: "New message from [User]" or "New message in [Channel]"
- **Body**: Message preview (truncated to 140 chars)
- **Icon**: App icon
- **Actions**: Click to open the conversation
- **Sound**: Notification sound
- **Vibration**: 200ms-100ms-200ms pattern (mobile)

## Troubleshooting

### Notifications Not Working?

1. **Check browser permissions**
   ```
   Chrome: Settings → Privacy → Site Settings → Notifications
   Safari: Settings → Safari → Website Settings → Notifications
   ```

2. **Reinstall PWA**
   - Remove from home screen
   - Clear browser cache
   - Add to home screen again
   - Grant permissions when prompted

3. **Check Do Not Disturb**
   - Ensure phone isn't in DND mode
   - Check system notification settings

4. **Browser Requirements**
   - Chrome 42+ (Android/Desktop)
   - Safari 16.4+ (iOS 16.4+)
   - Edge 17+
   - Firefox 44+

### Service Worker Issues?

1. **Clear service worker**
   ```javascript
   // In browser console:
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(reg => reg.unregister());
   });
   ```

2. **Hard refresh**
   - Desktop: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Mobile: Clear browser cache in settings

## Testing

### Test Notification Manually

1. Open browser console (F12)
2. Run:
   ```javascript
   // Request permission
   Notification.requestPermission().then(permission => {
     if (permission === 'granted') {
       new Notification('Test', {
         body: 'Notifications are working!',
         icon: '/icon-192.png'
       });
     }
   });
   ```

### Check Service Worker Status

```javascript
// In console:
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Registered:', registrations.length);
  registrations.forEach(reg => {
    console.log('Scope:', reg.scope);
    console.log('Active:', reg.active);
  });
});
```

## Next Steps (Optional Enhancements)

1. **Web Push API with VAPID**
   - Implement server-side push notifications
   - Works even when app is closed
   - Requires backend setup

2. **Notification Preferences**
   - Per-channel notification settings
   - Quiet hours/Do Not Disturb
   - Custom notification sounds

3. **Rich Notifications**
   - Inline reply
   - Action buttons (Mark as read, Reply)
   - Image previews

## Browser Support

| Feature | Chrome | Safari | Firefox | Edge |
|---------|--------|--------|---------|------|
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| Push Notifications | ✅ | ✅ (16.4+) | ✅ | ✅ |
| Background Sync | ✅ | ❌ | ❌ | ✅ |
| Share Target | ✅ | ✅ | ❌ | ✅ |

## Security & Privacy

- Notifications respect platform DND settings
- Message content is truncated for privacy
- Notifications auto-clear when clicked
- Permission can be revoked anytime in browser settings
- No notification data stored on servers

---

**Need help?** Check the browser console for detailed logs.
