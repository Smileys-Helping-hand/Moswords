# Android Studio Physical Testing Guide

## 🎯 Complete APK Testing Procedure

This guide walks you through testing the Moswords APK in Android Studio with a virtual device.

---

## 🚀 Step 1: Open APK in Android Studio

### Option A: Direct APK Installation (Recommended)

1. **Open Android Studio**
   - File → Open
   - Navigate to: `k:\Projects\moswords\android\app\build\outputs\apk\release\app-release.apk`

2. **Install via ADB**
   ```bash
   # Open terminal in Android Studio or use system terminal
   adb install -r k:\Projects\moswords\android\app\build\outputs\apk\release\app-release.apk
   ```

3. **Launch App**
   - Click **Run** → **Run 'app'**
   - Or manually in terminal:
   ```bash
   adb shell am start -n com.moswords.app/.MainActivity
   ```

### Option B: Open Android Project

1. **Open the Android folder**
   - File → Open
   - Navigate to: `k:\Projects\moswords\android`

2. **Wait for Gradle sync**
   - Let Android Studio sync (5-10 minutes first time)

3. **Select emulator/device**
   - Top toolbar: Select "Pixel 6 (API 34)" or physical device

4. **Run the app**
   - Click green **Play** button (▶)

---

## 🎮 Step 2: Android Emulator Setup (Virtual Device)

### Create Virtual Device

1. **Open Device Manager**
   - Tools → Device Manager

2. **Create New Device**
   - Click **Create Device**
   - Select: **Pixel 6** (recommended for testing)
   - API Level: **34+**
   - RAM: **4GB**
   - Storage: **64GB**
   - Click **Finish**

3. **Start Emulator**
   - Right-click device → **Launch**
   - Wait for Android to boot (~2-3 minutes)

4. **Unlock virtual device**
   - Click on device screen
   - Swipe up to unlock

---

## 🧪 Step 3: Test Sequence (Complete)

### TEST 1: App Launch & Splash Screen

**Expected:**
- Splash screen appears immediately
- "Moswords" logo visible
- Status bar is dark
- Splash lasts ~2.5 seconds
- Transitions to login screen smoothly

**Actual Result:**
- [ ] PASS
- [ ] FAIL (Issue: ___________________)

**Screenshots:**
- Before: _________________
- After: __________________

---

### TEST 2: Login Flow

**Setup:** App at login screen

**Test Steps:**

1. **View login form**
   - Email input field visible
   - Password input field visible
   - Login button visible
   - Google OAuth button visible

2. **Test email/password login**
   ```
   Email: test@moswords.app
   Password: TestPass123!
   ```
   - Click **Login**
   - Wait for authentication (3-5 seconds)

3. **Verify redirect**
   - Should navigate to dashboard
   - Splash screen should NOT appear again
   - No error messages

**Actual Result:**
- [ ] PASS
- [ ] FAIL (Issue: ___________________)

**Observed Behavior:**
- Login took ___ seconds
- Dashboard loaded with ___ elements
- No errors: [ ] Yes [ ] No

---

### TEST 3: Dashboard & Navigation

**Expected:** Dashboard fully loads with all sections

**Test Steps:**

1. **Check dashboard structure**
   - [ ] Top navigation bar visible
   - [ ] Main content area visible
   - [ ] Bottom navigation tabs visible (mobile)
   - [ ] No blank/white areas

2. **Navigate through sections**
   - [ ] Click "Chats" tab → loads conversations
   - [ ] Click "Contacts" tab → loads contact list
   - [ ] Click "Profile" tab → shows user profile
   - [ ] Click "Settings" tab → shows settings

3. **Check layout responsiveness**
   - Rotate device to landscape
   - [ ] Layout adapts properly
   - [ ] No text cutoff
   - [ ] Buttons still tappable
   - Rotate back to portrait
   - [ ] Layout reverts properly

**Actual Result:**
- [ ] PASS
- [ ] FAIL (Issue: ___________________)

---

### TEST 4: Friends List & Operations

**Expected:** Can view and manage friends

**Test Steps:**

1. **View friends list**
   - Click **Friends** or **Contacts** section
   - [ ] List loads
   - [ ] User names visible
   - [ ] Profile pictures visible (if any)
   - Count: ___ friends shown

2. **Send friend request**
   - Click **Add Friend** or **+** button
   - Enter: `friend@example.com`
   - Click **Send Request**
   - [ ] Confirmation message appears
   - [ ] Request appears in pending

3. **View pending requests**
   - Navigate to Pending Requests
   - [ ] Request visible
   - [ ] Accept button visible
   - [ ] Decline button visible

4. **Test accept/decline**
   - Click **Accept**
   - [ ] Status updates to "Friends"
   - [ ] Appears in friends list
   
   (Or test Decline)
   - Click **Decline**
   - [ ] Request removed
   - [ ] No longer in pending

**Actual Result:**
- [ ] PASS
- [ ] FAIL (Issue: ___________________)

---

### TEST 5: Chat/Messaging

**Expected:** Can send and receive messages

**Test Steps:**

1. **Open conversation**
   - Click on a chat/conversation
   - [ ] Chat history visible
   - [ ] Message input box visible
   - [ ] Send button visible

2. **Send message**
   - Type: `Test message from mobile`
   - Click **Send** or press enter
   - [ ] Message appears immediately
   - [ ] No error messages

3. **Check message styling**
   - [ ] Message is on right side (if sender)
   - [ ] Background color correct
   - [ ] Timestamp visible
   - [ ] Delivery status shown (if applicable)

4. **Test emoji**
   - Click emoji button
   - [ ] Emoji picker opens
   - [ ] Can select emoji
   - [ ] Emoji appears in message

5. **Test attachments** (if applicable)
   - Click attachment button
   - [ ] File picker opens
   - [ ] Can select file
   - [ ] File uploads and appears in chat

**Actual Result:**
- [ ] PASS
- [ ] FAIL (Issue: ___________________)

---

### TEST 6: MFA Setup (Optional)

**Expected:** Can set up two-factor authentication

**Test Steps:**

1. **Navigate to Settings**
   - Click **Settings** tab
   - [ ] Settings page loads

2. **Find MFA section**
   - Scroll to **Two-Factor Authentication**
   - [ ] MFA section visible
   - [ ] Setup button visible

3. **Start TOTP setup**
   - Click **Setup Authenticator App**
   - [ ] QR code appears
   - [ ] Manual entry key visible
   - [ ] Copy button works

4. **Test Email MFA option**
   - Click **Email Code** option
   - [ ] Email option visible
   - [ ] Shows email address (masked)
   - [ ] Send code button visible

5. **Try sending email code**
   - Click **Send Verification Code**
   - [ ] No immediate error
   - [ ] Confirmation message appears

**Actual Result:**
- [ ] PASS
- [ ] FAIL (Issue: ___________________)

---

### TEST 7: Settings & Preferences

**Expected:** Can change settings

**Test Steps:**

1. **Access Settings**
   - Click **Settings** or gear icon
   - [ ] Settings page loads
   - [ ] Organized in sections

2. **Test Theme/Appearance**
   - Find **Appearance** setting
   - [ ] Theme options visible
   - Select dark/light/custom theme
   - [ ] Theme changes immediately
   - [ ] Background color changes
   - [ ] Text color changes

3. **Test Notifications**
   - Find **Notifications** setting
   - [ ] Toggle options visible
   - Try enabling/disabling
   - [ ] Toggles respond

4. **Test Privacy**
   - Find **Privacy** settings
   - [ ] Options visible
   - [ ] Can adjust settings

**Actual Result:**
- [ ] PASS
- [ ] FAIL (Issue: ___________________)

---

### TEST 8: Keyboard & Input Handling

**Expected:** Keyboard appears/disappears correctly

**Test Steps:**

1. **Click input field**
   - Tap on any text input
   - [ ] Keyboard appears
   - [ ] Input field still visible (not covered by keyboard)

2. **Type text**
   - Type: `Hello World`
   - [ ] Text appears in field
   - [ ] No lag in typing
   - [ ] Text is readable

3. **Submit form**
   - Press Enter or click button
   - [ ] Keyboard dismisses
   - [ ] Form submits (if applicable)

4. **Test in different views**
   - Repeat in: login, chat, search, compose
   - [ ] Keyboard behaves consistently

**Actual Result:**
- [ ] PASS
- [ ] FAIL (Issue: ___________________)

---

### TEST 9: Network & API Calls

**Expected:** App connects to server and fetches data

**Test Steps:**

1. **Check network connection**
   - Device should be on WiFi
   - [ ] App loads data from server

2. **Monitor API calls**
   - Open Chrome DevTools (via adb)
   ```bash
   adb shell am start -n com.moswords.app/.MainActivity
   chrome://inspect
   ```
   - [ ] Network tab shows API calls
   - [ ] Response codes are 200/201
   - [ ] No 401/403/500 errors

3. **Check data synchronization**
   - Make change on app
   - [ ] Change appears in real-time
   - [ ] No stale data

**Actual Result:**
- [ ] PASS
- [ ] FAIL (Issue: ___________________)

---

### TEST 10: Performance & Memory

**Expected:** App runs smoothly without memory leaks

**Test Steps:**

1. **Monitor memory**
   ```bash
   adb shell dumpsys meminfo com.moswords.app
   ```
   - Initial memory: ___ MB
   - [ ] Under 150MB

2. **Use app for 5 minutes**
   - Navigate through screens
   - Send messages
   - Load images/content
   - Open/close chats

3. **Check memory again**
   ```bash
   adb shell dumpsys meminfo com.moswords.app
   ```
   - Final memory: ___ MB
   - [ ] Not significantly increased
   - [ ] No more than 200MB

4. **Test scrolling**
   - Scroll through friend list
   - Scroll through chat history
   - [ ] Smooth scrolling (60 FPS)
   - [ ] No janky animations

5. **Test transitions**
   - Navigate between screens
   - [ ] Smooth transitions
   - [ ] No freezing
   - [ ] Takes <500ms per transition

**Actual Result:**
- [ ] PASS
- [ ] FAIL (Issue: ___________________)

---

### TEST 11: Offline Mode

**Expected:** App gracefully handles offline state

**Test Steps:**

1. **Enable airplane mode**
   - Settings → Airplane Mode → ON
   - [ ] WiFi disconnects
   - Wait 2 seconds

2. **Try to load data**
   - Click refresh or navigate
   - [ ] Offline message appears
   - [ ] App doesn't crash
   - [ ] No timeout errors

3. **Send message (if cached)**
   - Try to send message
   - [ ] Either sends when online or shows "Pending"
   - [ ] No crash

4. **Disable airplane mode**
   - Settings → Airplane Mode → OFF
   - WiFi reconnects
   - Wait 3 seconds
   - [ ] App syncs automatically
   - [ ] Data reloads
   - [ ] Messages send

**Actual Result:**
- [ ] PASS
- [ ] FAIL (Issue: ___________________)

---

### TEST 12: Crash & Stability

**Expected:** App doesn't crash under normal use

**Test Steps:**

1. **Perform stress test**
   - Rapid navigation between screens
   - Quickly open/close multiple chats
   - Send multiple messages in rapid succession
   - Upload multiple images
   - [ ] App stays responsive
   - [ ] No crashes

2. **Check error logs**
   ```bash
   adb logcat | grep -i error
   ```
   - [ ] No error messages
   - [ ] No stack traces

3. **Check console logs**
   - Open Chrome inspector
   - [ ] Console tab clean
   - [ ] No red errors
   - [ ] No warnings about memory

4. **Force stop and restart**
   ```bash
   adb shell am force-stop com.moswords.app
   adb shell am start -n com.moswords.app/.MainActivity
   ```
   - [ ] App restarts cleanly
   - [ ] Data preserved
   - [ ] No crash on startup

**Actual Result:**
- [ ] PASS
- [ ] FAIL (Issue: ___________________)

---

## 📊 Test Summary

| Test # | Name | Status | Issues |
|--------|------|--------|--------|
| 1 | Launch & Splash | [ ] | |
| 2 | Login Flow | [ ] | |
| 3 | Dashboard | [ ] | |
| 4 | Friends List | [ ] | |
| 5 | Chat/Messaging | [ ] | |
| 6 | MFA Setup | [ ] | |
| 7 | Settings | [ ] | |
| 8 | Keyboard | [ ] | |
| 9 | Network/API | [ ] | |
| 10 | Performance | [ ] | |
| 11 | Offline Mode | [ ] | |
| 12 | Stability | [ ] | |

**Overall Status:**
- [ ] ALL PASS - Ready for release
- [ ] SOME FAIL - Fix issues, retest
- [ ] MANY FAIL - Major issues, rebuild

---

## 🐛 Issues Found

### Issue #1
- **Test:** ____
- **Description:** ________________________
- **Steps to Reproduce:** ________________________
- **Expected:** ________________________
- **Actual:** ________________________
- **Fix:** ________________________

### Issue #2
...

---

## ✅ Sign-Off

**Tested By:** ___________________  
**Date/Time:** ___________________  
**Device:** Android Emulator / Physical Device  
**Build Version:** app-release.apk v1.0.0  
**Status:**
- [ ] **PASS** - All 12 tests passed
- [ ] **CONDITIONAL PASS** - Pass with known issues (list above)
- [ ] **FAIL** - Critical issues found (resolve before release)

**Notes:**
```
[Add any additional observations or feedback]
```

---

## 🚀 If All Tests Pass

Once all 12 tests pass:

1. **Build new production APK**
   ```bash
   ./gradlew clean assembleRelease
   ```

2. **Verify APK**
   ```bash
   ls -lh android/app/build/outputs/apk/release/app-release.apk
   ```

3. **Sign with release key** (already done)
   - ✅ Signed with Moswords Release Key

4. **Push to GitHub/release**
   - Ready for distribution

---

**Remember:** Test thoroughly, document issues, fix before building new APK!

