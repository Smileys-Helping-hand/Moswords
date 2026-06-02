# Moswords App - Testing Checklist

## Android Studio Testing Guide

### Prerequisites
- Android Studio is open with the `moswords/android` project
- Debug APK built successfully: `apk/Moswords.apk`
- Connect an Android device or use an emulator

### Phase 1: Basic App Launch (Smooth & Responsive)
- [ ] App launches without crashes
- [ ] Splash screen appears smoothly
- [ ] Login page loads with proper animations
- [ ] UI elements animate smoothly (no jank)
- [ ] Scrolling feels responsive and smooth (60fps)

### Phase 2: Authentication & Setup
- [ ] Login with test credentials works
- [ ] Error messages display properly
- [ ] Transitions between screens are smooth

### Phase 3: Chat Features (Core Functionality)
#### Messaging
- [ ] Load conversation list quickly (cached from local storage)
- [ ] Click on conversation opens chat
- [ ] Messages display with proper formatting
- [ ] Send message works
- [ ] Message reactions work
- [ ] Long-press actions (copy, delete) work
- [ ] Media uploads work (images, videos)

#### Animations & Polish
- [ ] Message bubbles animate in smoothly
- [ ] Read receipts (✓ ✓✓) display correctly
- [ ] Typing indicator animates smoothly
- [ ] Message status changes animate
- [ ] Avatar images load and animate

### Phase 4: Offline Functionality (Critical)
- [ ] Turn off WiFi/Mobile data
- [ ] App shows offline banner
- [ ] Can still view cached messages
- [ ] Can draft messages (optimistic UI)
- [ ] Messages queue when offline
- [ ] Turn WiFi back on
- [ ] Messages sync automatically
- [ ] No duplicate messages after sync

### Phase 5: UI/UX Polish
#### Visual
- [ ] Colors look correct
- [ ] Typography is readable
- [ ] Spacing and padding consistent
- [ ] Dark mode works if enabled
- [ ] Safe areas respected (notch, status bar)

#### Scrolling & Performance
- [ ] Conversation list scrolls smoothly
- [ ] Chat history scrolls smoothly
- [ ] No lag when loading more messages
- [ ] Pull-to-refresh works (if implemented)
- [ ] No memory leaks (check RAM usage)

### Phase 6: Mobile-Specific Features
- [ ] Keyboard appears/disappears smoothly
- [ ] Input field expands as needed
- [ ] Mobile menu navigation works
- [ ] Buttons sized for touch (min 44x44px)
- [ ] Haptic feedback works (if implemented)

### Phase 7: Performance Metrics
- [ ] App launches in < 2 seconds
- [ ] Conversation list loads in < 500ms
- [ ] Chat history loads smoothly
- [ ] No visible freezes or stutters
- [ ] Battery usage is reasonable
- [ ] APK size is lightweight (~50-100MB for debug)

### Phase 8: Edge Cases & Error Handling
- [ ] Network reconnection handled
- [ ] Sending large media files works
- [ ] Long conversations scroll smoothly
- [ ] Special characters display correctly
- [ ] Encrypted messages show lock icon
- [ ] Failed messages show retry button

### Phase 9: Build & Distribution
- [ ] APK size is optimized (under 100MB debug)
- [ ] App works on multiple Android versions (8.0+)
- [ ] No crashes in logs
- [ ] No missing permissions warnings

## Testing Commands

### Run the APK on Device
```bash
adb install -r apk/Moswords.apk
adb shell am start -n com.moswords.app/.MainActivity
```

### Monitor Logs
```bash
adb logcat | grep -i error
adb logcat | grep -i "moswords\|capacitor"
```

### Check Performance
```bash
adb shell dumpsys meminfo com.moswords.app
adb shell top -n 1 | grep moswords
```

## Notes

✅ **Completed Optimizations:**
- Offline-first architecture with IndexedDB caching
- React.memo() for heavy components
- Smooth animations with Framer Motion
- Image lazy loading
- PWA support for fast loading
- Capacitor for native mobile features

🔧 **What to Test:**
1. App feels "alive" with smooth animations
2. Offline caching works - shows messages without internet
3. Lightweight APK size
4. All features function properly
5. UI/UX scrolling is buttery smooth

## Success Criteria

✅ App launches without crashes
✅ Smooth 60fps animations and scrolling
✅ Offline mode works with cached data
✅ All features tested and working
✅ APK is lightweight and distributable
