# 📱 Android APK Quick Start Guide

## 🚀 Quick Build (2 Methods)

### Method 1: Local Development (Recommended for Testing)

This method connects the Android app to your local development server.

**Step 1:** Find your computer's local IP address
```powershell
# On Windows
ipconfig
# Look for "IPv4 Address" (e.g., 192.168.1.100)
```

**Step 2:** Start your development server
```bash
npm run dev
```

**Step 3:** Update `capacitor.config.ts`
```typescript
server: {
  url: 'http://192.168.1.100:3000',  // YOUR IP HERE
  cleartext: true,
  androidScheme: 'http',
},
```

**Step 4:** Sync and open Android Studio
```bash
npm run mobile:sync
npm run mobile:open:android
```

**Step 5:** In Android Studio
1. Wait for Gradle sync to complete
2. Click the green "Run" ▶️ button
3. Select your device/emulator
4. App will install automatically!

APK Location: `android/app/build/outputs/apk/debug/app-debug.apk`

---

### Method 2: Production Build (For Distribution)

This method points to your deployed app (requires deploying to Vercel/AWS/etc first).

**Step 1:** Deploy your app
```bash
npm run build
# Deploy to Vercel, AWS, or your hosting provider
```

**Step 2:** Update `capacitor.config.prod.ts`
```typescript
server: {
  url: 'https://your-app-url.vercel.app',  // YOUR PRODUCTION URL
  androidScheme: 'https',
},
```

**Step 3:** Sync with production config
```bash
npm run mobile:sync:prod
```

**Step 4:** Build release APK
```bash
npm run mobile:open:android
```

In Android Studio:
1. Build → Generate Signed Bundle / APK
2. Select APK → Next
3. Create new keystore (first time) or use existing
4. Build Release APK

---

## 📋 Prerequisites

### Required Software
- ✅ [Android Studio](https://developer.android.com/studio) (Electric Eel or newer)
- ✅ [Java JDK 17](https://adoptium.net/) or higher
- ✅ Android SDK (API Level 33+)

### Setup Android Studio
1. Install Android Studio
2. Open SDK Manager: Tools → SDK Manager
3. Install:
   - Android SDK Platform 33 (or newer)
   - Android SDK Build-Tools
   - Android SDK Command-line Tools
4. Accept licenses:
   ```bash
   cd %ANDROID_HOME%/cmdline-tools/latest/bin
   sdkmanager --licenses
   ```

---

## 🎨 Customize Your App

### Change App Icon
Replace these files in `android/app/src/main/res/`:
- `mipmap-mdpi/ic_launcher.png` (48x48)
- `mipmap-hdpi/ic_launcher.png` (72x72)
- `mipmap-xhdpi/ic_launcher.png` (96x96)
- `mipmap-xxhdpi/ic_launcher.png` (144x144)
- `mipmap-xxxhdpi/ic_launcher.png` (192x192)

Or use [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html)

### Change App Name
Edit `android/app/src/main/res/values/strings.xml`:
```xml
<string name="app_name">Your App Name</string>
```

### Update Version
Edit `android/app/build.gradle`:
```gradle
versionCode 1  // Increment for each release
versionName "1.0.0"  // Display version
```

---

## 🔧 Troubleshooting

### "SDK location not found"
Create `android/local.properties`:
```properties
sdk.dir=C\:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk
```

### App shows blank screen
1. Check server URL in capacitor.config.ts
2. Ensure dev server is running (Method 1)
3. Check Chrome DevTools: `chrome://inspect` → Inspect WebView

### Gradle build fails
```bash
cd android
./gradlew clean
cd ..
npm run mobile:sync
```

### Can't connect to localhost
- Use `10.0.2.2:3000` for Android Emulator
- Use your actual IP (e.g., `192.168.1.100:3000`) for real device
- Ensure firewall allows connection

---

## 📦 Distribution

### Debug APK (for testing)
- Location: `android/app/build/outputs/apk/debug/app-debug.apk`
- Share via USB, email, or cloud storage
- Users need to enable "Install from unknown sources"

### Release APK (for production)
1. Create signing key (first time only):
   ```bash
   keytool -genkey -v -keystore moswords-release-key.jks -alias moswords -keyalg RSA -keysize 2048 -validity 10000
   ```

2. In Android Studio: Build → Generate Signed Bundle / APK
3. **IMPORTANT:** Save your keystore file and passwords securely!

### Google Play Store
1. Create Google Play Developer account ($25 one-time fee)
2. Build signed AAB (Android App Bundle):
   - Build → Generate Signed Bundle / APK → Android App Bundle
3. Upload to Play Console
4. Complete store listing, screenshots, etc.
5. Submit for review

---

## 🎯 Testing Checklist

- [ ] App installs without errors
- [ ] Splash screen shows correctly
- [ ] Main page loads
- [ ] Authentication works
- [ ] Messages send/receive
- [ ] Images load properly
- [ ] Keyboard doesn't cover input fields
- [ ] Back button works as expected
- [ ] App handles network loss gracefully
- [ ] Notifications work (if implemented)
- [ ] Camera/file picker works (if used)
- [ ] App survives background/foreground transitions

---

## 🚀 Quick Commands Reference

```bash
# Sync changes to Android
npm run mobile:sync

# Open Android Studio
npm run mobile:open:android

# Run on connected device (quick test)
npm run mobile:run:android

# Check configuration
npx cap doctor

# View logs
npx cap run android --livereload

# Clean build
cd android && ./gradlew clean && cd ..
```

---

## 📱 Connecting Real Device

1. Enable Developer Options on your phone:
   - Settings → About Phone → Tap "Build Number" 7 times
2. Enable USB Debugging:
   - Settings → Developer Options → USB Debugging ON
3. Connect via USB
4. Accept debugging prompt on phone
5. Verify connection:
   ```bash
   adb devices
   ```

---

## 🎉 Success!

Your Android APK is ready! You can now:
- ✅ Install on your phone
- ✅ Share with testers
- ✅ Find APK in: `android/app/build/outputs/apk/debug/`
- ✅ Test all features on real device

**Need help?** Check [Capacitor Docs](https://capacitorjs.com/docs/android)
