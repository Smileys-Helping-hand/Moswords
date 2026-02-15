# Mobile App Build Instructions

## Prerequisites
1. Install [Android Studio](https://developer.android.com/studio)
2. Install Java JDK 17 or higher
3. Set up Android SDK (API Level 33 or higher recommended)

## Building for Android

### Option 1: Build for Development (with local server)

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Find your local IP address:**
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` or `ip addr`

3. **Update capacitor.config.ts:**
   Uncomment and update the server URL:
   ```typescript
   server: {
     url: 'http://YOUR_LOCAL_IP:3000',  // Replace with your IP
     cleartext: true,
   }
   ```

4. **Sync and open Android Studio:**
   ```bash
   npm run mobile:sync
   npm run mobile:open:android
   ```

5. **Build APK in Android Studio:**
   - Click "Build" → "Build Bundle(s) / APK(s)" → "Build APK(s)"
   - APK will be in: `android/app/build/outputs/apk/debug/app-debug.apk`

### Option 2: Build for Production (with deployed server)

1. **Deploy your app** (e.g., to Vercel, AWS, etc.)

2. **Update capacitor.config.ts:**
   ```typescript
   server: {
     url: 'https://your-deployed-app.vercel.app',
   }
   ```

3. **Build and sync:**
   ```bash
   npm run mobile:build
   npm run mobile:sync
   ```

4. **Open Android Studio and build:**
   ```bash
   npm run mobile:open:android
   ```

5. **Build release APK:**
   - Build → Generate Signed Bundle / APK
   - Follow the wizard to create/use keystore

### Option 3: Quick Development Build

Run directly on connected device/emulator:
```bash
npm run mobile:run:android
```

## App Icons and Splash Screen

Place your app icons in the following locations:
- `android/app/src/main/res/mipmap-*/ic_launcher.png`
- Or use [Capacitor Asset Generator](https://github.com/capacitor-community/capacitor-assets)

## Troubleshooting

### Build fails with "out directory not found"
Make sure to build Next.js first:
```bash
npm run build
npm run mobile:sync
```

### App shows blank screen
1. Check capacitor.config.ts server URL is correct
2. Ensure CORS is enabled on your backend
3. Check Android logcat for errors

### Keyboard issues
The app is configured to resize when keyboard appears. Adjust in capacitor.config.ts if needed.

## Production Checklist

- [ ] Update app icons and splash screen
- [ ] Set correct production URL in capacitor.config.ts
- [ ] Update version in `android/app/build.gradle`
- [ ] Create signing keystore for release builds
- [ ] Test on multiple Android versions
- [ ] Enable ProGuard for release builds
- [ ] Test offline functionality
- [ ] Verify all permissions in AndroidManifest.xml

## Useful Commands

```bash
# Sync changes to Android project
npm run mobile:sync

# Open Android Studio
npm run mobile:open:android

# Run on device/emulator
npm run mobile:run:android

# Check Capacitor configuration
npx cap doctor
```

## Environment-Specific Builds

You can create multiple capacitor config files:
- `capacitor.config.ts` - Default
- `capacitor.config.dev.ts` - Development
- `capacitor.config.prod.ts` - Production

Use: `npx cap sync --config capacitor.config.dev.ts`
