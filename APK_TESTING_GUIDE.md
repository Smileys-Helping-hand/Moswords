# Moswords APK Testing Guide

## Quick Start
1. **APK Location:** `android/app/build/outputs/apk/release/app-release.apk`
2. **App Name:** Moswords
3. **Package ID:** com.moswords.app
4. **Size:** 5.1 MB

## Installation Methods

### Option A: Android Studio Emulator
```bash
# Open Android Studio > Device Manager > Create AVD (Android Virtual Device)
# Select Android 13+ for best compatibility
# Then run:
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Option B: Physical Device (USB Debugging)
```bash
# Enable USB Debugging on device (Settings > Developer Options)
# Connect device via USB
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Option C: Manual Installation
- Copy APK to device via file transfer
- Open file manager, tap APK to install
- Allow installation from unknown sources if prompted

---

## UI/UX Testing Checklist

### 1. Launch & Splash Screen
- [ ] Splash screen shows "Moswords" logo
- [ ] Splash screen displays for ~2.5 seconds
- [ ] Status bar is dark (matches app theme)
- [ ] No freezing or loading issues

### 2. Login Screen
- [ ] Login page loads without errors
- [ ] Email/password input fields are visible
- [ ] Google login button is present and clickable
- [ ] Keyboard appears/disappears correctly
- [ ] Form validation works (error messages show)

### 3. MFA Setup (Optional)
- [ ] MFA section accessible in settings
- [ ] Both methods visible:
  - [ ] Authenticator App (QR code)
  - [ ] Email Code option
- [ ] QR code displays properly
- [ ] Token input accepts 6 digits
- [ ] Email code flow works

### 4. Main Dashboard
- [ ] Dashboard loads correctly after login
- [ ] All sections visible:
  - [ ] Conversations/Chats list
  - [ ] Contacts list
  - [ ] Status updates
  - [ ] Servers/Groups
- [ ] Bottom navigation bar is accessible
- [ ] No UI elements are cut off

### 5. Chat & Messaging
- [ ] Can open conversations
- [ ] Messages display correctly
- [ ] Emoji picker works
- [ ] Send message button responsive
- [ ] Message reactions work
- [ ] Typing indicators appear
- [ ] Media upload works (if applicable)

### 6. Friend Features
- [ ] Friend list loads
- [ ] Can send friend requests
- [ ] Pending requests display
- [ ] Accept/Reject buttons work
- [ ] Friend profiles show correctly
- [ ] Contact sync works

### 7. Settings & Profile
- [ ] Profile page loads
- [ ] Edit profile works
- [ ] Settings sections accessible:
  - [ ] Appearance/Theme
  - [ ] Notifications
  - [ ] Privacy settings
  - [ ] About page
- [ ] Logout button works

### 8. Network & API Calls
- [ ] App connects to server (no CORS errors)
- [ ] WebView debugging shows successful API calls
- [ ] Session authentication works
- [ ] API responses display correctly
- [ ] Error handling shows graceful messages

### 9. UI/UX Polish
- [ ] All text is readable (font sizes OK)
- [ ] Colors match dark theme
- [ ] Buttons are large enough to tap
- [ ] No overlapping elements
- [ ] Smooth animations/transitions
- [ ] Keyboard doesn't cover input fields
- [ ] Safe area (notch) respected

### 10. Performance
- [ ] App launches in <3 seconds
- [ ] Scrolling is smooth (60fps)
- [ ] No janky animations
- [ ] Memory usage reasonable (<150MB)
- [ ] No crashes on back button
- [ ] Orientation changes handled correctly

### 11. Connectivity
- [ ] Works on WiFi
- [ ] Works on 4G/Mobile data
- [ ] Handles network loss gracefully
- [ ] Reconnects when network returns
- [ ] Offline mode shows proper messaging

### 12. Camera & Permissions
- [ ] Camera permission prompt works
- [ ] Camera access functions correctly (if used)
- [ ] Contact access works
- [ ] File permissions granted correctly

---

## Testing in Android Studio

### Enable WebView Debugging
```xml
<!-- Check if enabled in capacitor.config.ts -->
webContentsDebuggingEnabled: false  ← Set to true for development
```

### Check Device Logs
```bash
adb logcat | grep "Moswords\|ERROR\|WARN"
```

### Performance Profiling
- Android Studio > Profiler
- Monitor CPU, Memory, Network

---

## Known Issues & Fixes

### Issue: App won't launch
**Solution:** Clear app data
```bash
adb shell pm clear com.moswords.app
```

### Issue: White screen on startup
**Solution:** Check Capacitor config
- Verify `MOBILE_SERVER_URL` is correct
- Ensure network access is allowed
- Check AndroidManifest.xml permissions

### Issue: Keyboard overlaps input
**Solution:** Already configured in capacitor.config.ts
```ts
Keyboard: {
  resize: 'body',
  resizeOnFullScreen: true,
}
```

### Issue: CORS errors in WebView
**Solution:** CapacitorHttp plugin enabled in config
```ts
CapacitorHttp: {
  enabled: true,  ← Bypasses CORS at native layer
}
```

---

## Build Information
- **Keystore:** `keystore/moswords-release.keystore`
- **Signing:** Configured with release key
- **Min SDK:** Android 7.0 (API 24)
- **Target SDK:** Android 14+ (API 34+)
- **Capacitor Version:** 8.0.0+

---

## Submission Readiness

Before shipping to Google Play/distribution:
- [ ] All tests in checklist pass
- [ ] No crashes on any feature
- [ ] Performance is smooth
- [ ] Icons and branding correct
- [ ] Version number incremented
- [ ] Privacy policy linked
- [ ] Permissions justified

---

## Contact & Support
For issues during testing, check:
1. Device logs: `adb logcat`
2. Capacitor config: `capacitor.config.ts`
3. AndroidManifest.xml permissions
4. Network connectivity

