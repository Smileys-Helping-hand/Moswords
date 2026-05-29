# Mobile Testing Guide - Android Studio & Physical Devices

## 🚀 Setup Android Studio Emulator

### 1. Install Android Studio
```bash
# Download from: https://developer.android.com/studio
# Install and launch
```

### 2. Create Virtual Device
```
AVD Manager → Create Virtual Device
- Device: Pixel 6 (recommended)
- API Level: 33+ (Android 13+)
- RAM: 4GB minimum (8GB recommended)
- Storage: 2GB
```

### 3. Run Emulator
```
Tools → Device Manager → [Your Device] → Play button
# Wait for Android to boot (2-3 minutes)
```

### 4. Access Local App
```bash
# Find your local IP
ipconfig (Windows) or ifconfig (Mac)

# In emulator browser:
http://YOUR_IP:3000

# OR test local loopback:
http://10.0.2.2:3000  (special address for emulator)
```

---

## 📱 Features to Test

### Messaging Core
- [ ] Send text message
- [ ] Message appears immediately (optimistic update)
- [ ] Message shows "sending" → "sent" → "delivered" → "read"
- [ ] Receive messages
- [ ] Typing indicator appears
- [ ] Read receipts work
- [ ] Message deletion
- [ ] Message editing

### Rich Messages
- [ ] Send emoji in message
- [ ] Emoji renders correctly
- [ ] Emoji reaction on message
- [ ] Multiple reactions visible
- [ ] Sticker sending
- [ ] Sticker receiving
- [ ] GIF sending
- [ ] Image upload and preview

### Chat Features
- [ ] Group chat creation
- [ ] Add member to group
- [ ] Remove member
- [ ] Group info visible
- [ ] Group mute/unmute
- [ ] Archive conversation
- [ ] Search messages
- [ ] Clear chat history

### People/Contacts
- [ ] Open People page
- [ ] View friends list
- [ ] View pending requests
- [ ] Accept friend request
- [ ] Reject friend request
- [ ] QR code displays
- [ ] QR code scanning (camera permission)
- [ ] Add friend via QR
- [ ] Send message to new friend

### UI/UX
- [ ] Bottom nav works (5 tabs)
- [ ] Tab switching smooth
- [ ] Page transitions smooth
- [ ] No layout shifts
- [ ] Text readable
- [ ] Buttons responsive
- [ ] Touch targets 44px+ (mobile)
- [ ] No horizontal scroll (except intentional)

### Performance
- [ ] App loads in < 2 seconds
- [ ] Switching tabs instant
- [ ] Scrolling smooth (60fps)
- [ ] No lag when typing
- [ ] No memory leaks
- [ ] Background operations don't block UI
- [ ] Images load progressively

### Responsive Design
- [ ] Looks good on 4" screen
- [ ] Looks good on 5" screen
- [ ] Looks good on 6" screen
- [ ] Looks good on 7" tablet
- [ ] Landscape mode works
- [ ] Portrait mode works
- [ ] Safe area respected (notch, buttons)

### Error Handling
- [ ] Network error shows message
- [ ] Offline mode works (PWA)
- [ ] Retry failed messages
- [ ] Handle permission denials
- [ ] Show friendly error messages
- [ ] Recover from crashes

### Accessibility
- [ ] Text is readable
- [ ] Buttons are clickable
- [ ] Touch targets adequate (44px)
- [ ] Color contrast sufficient
- [ ] No essential info color-only

### Battery & Data
- [ ] App doesn't drain battery
- [ ] Background tasks minimal
- [ ] Uses reasonable data
- [ ] Images optimized
- [ ] No constant API calls

---

## 🧪 Test Scenarios

### Scenario 1: Normal Chat Flow
1. Open app
2. Go to chats
3. Open a conversation
4. Send a message with emoji
5. Receive a reply
6. React to the message
7. Go back to chat list
8. ✅ Everything smooth

### Scenario 2: Mobile Performance
1. Open app on Pixel 6 emulator
2. Measure load time (should be < 2s)
3. Switch between tabs 5 times (should be instant)
4. Scroll through chat (should be smooth 60fps)
5. Send 10 messages rapidly (no lag)
6. ✅ No jank or stuttering

### Scenario 3: QR Code Addition
1. Open People page
2. Click QR icon
3. Show your QR code
4. Switch to "Scan" tab
5. Tap "Open Camera"
6. Allow camera permission
7. Point at another device's QR
8. Accept/message the friend
9. ✅ Should complete in < 10 seconds

### Scenario 4: Offline Functionality
1. Go to airplane mode
2. Open app (should still show cached data)
3. Try to send message (should queue)
4. Go back online
5. Message should send automatically
6. ✅ PWA handles offline gracefully

### Scenario 5: Group Chat
1. Create group chat
2. Add multiple members (5+)
3. Send messages
4. Receive from others
5. Test group info
6. Leave group
7. ✅ Group functions work smoothly

---

## 🔍 Performance Measurements

### Use Android Studio Profiler

#### CPU Profiling
```
Profiler Tab → CPU
- Send a message
- Check CPU usage (should spike briefly, then return to baseline)
- Acceptable: < 50% for 1 second
```

#### Memory Profiling
```
Profiler Tab → Memory
- Use app for 5 minutes
- Memory should stabilize (not continuously grow)
- Acceptable: < 200MB for normal usage
```

#### Network Profiling
```
Profiler Tab → Network
- Send message (check request size)
- Load chat list (check payload size)
- Each message request: < 2KB
- Chat list: < 100KB
```

#### Battery Profiling
```
Profiler Tab → Energy
- App idle: < 1% drain per minute
- Sending message: spike acceptable
- Receiving: minimal drain
```

---

## 🐛 Bug Template

When you find an issue:

```
## Bug: [Title]

**Device:** Pixel 6, Android 13
**Action:** [What you did]
**Expected:** [What should happen]
**Actual:** [What happened]
**Steps to reproduce:**
1. 
2.
3.

**Severity:** Critical / High / Medium / Low
**Screenshots:** [If applicable]
```

---

## ✅ Pre-Release Checklist

### On Android Emulator
- [ ] All 9 feature categories tested
- [ ] All test scenarios completed
- [ ] No critical bugs found
- [ ] Performance acceptable
- [ ] All error handling works

### On Real Android Device
- [ ] Test on actual phone (Samsung/Google Pixel)
- [ ] Test on actual tablet (if available)
- [ ] Camera permission works
- [ ] Notifications work
- [ ] Background sync works

### On iOS (if possible)
- [ ] Test on iPhone (simulate with Safari)
- [ ] Test touch interactions
- [ ] Test orientation
- [ ] Test safe areas

### Final Sign-Off
- [ ] App is smooth and responsive
- [ ] No bugs blocking release
- [ ] Ready for production
- [ ] Performance meets targets

---

## 📊 Test Report Template

```
# Mobile Testing Report
- Date: 2026-05-28
- Device: Pixel 6 Emulator
- Android Version: 13
- App Version: 1.1.x

## Features Tested: 9/9 ✅
## Test Scenarios: 5/5 ✅
## Critical Bugs: 0
## High Priority Bugs: 0
## Medium Priority Bugs: [N]
## Low Priority Bugs: [N]

## Performance
- Load Time: 1.8s ✅
- Memory: 145MB ✅
- CPU Spike: 35% ✅
- Battery: Minimal ✅

## Status: READY FOR RELEASE
```

---

## 🎯 Common Issues & Fixes

### Issue: Camera not working
**Fix:** Check manifest permissions in capacitor.config.ts
```typescript
plugins: {
  Camera: { permissions: ['camera'] }
}
```

### Issue: Messages take long to send
**Fix:** Check network profiler, optimize payload size
```typescript
// Compress images before sending
// Batch API calls
// Use optimistic updates
```

### Issue: App crashes on scroll
**Fix:** Add virtual scrolling for large lists
```typescript
import { FixedSizeList } from 'react-window';
```

### Issue: Memory leak after 10 minutes
**Fix:** Clean up event listeners and timers
```typescript
useEffect(() => {
  const timer = setInterval(...);
  return () => clearInterval(timer); // Cleanup
}, []);
```

### Issue: QR scanner too slow
**Fix:** Reduce frame processing
```typescript
// Process every 3rd frame instead of every frame
if (frameCount % 3 === 0) {
  const code = jsQR(imageData);
}
```

---

## 📚 Resources

- [Android Studio Emulator Guide](https://developer.android.com/studio/run/emulator)
- [Chrome DevTools Remote Debugging](https://developer.chrome.com/docs/devtools/remote-debugging/)
- [Web Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
- [React Profiler](https://react.dev/reference/react/Profiler)

---

**Last Updated:** 2026-05-28
**Status:** Active
