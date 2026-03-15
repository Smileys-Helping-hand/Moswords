# Building the Moswords Android APK

## Architecture overview

The app is a **Capacitor hybrid app**: a native Android shell (WebView) that loads your
deployed Next.js backend. The phone doesn't run the server — the server runs on Vercel
(or any Node host) and the phone connects over HTTPS.

```
Phone (APK)
  └── Capacitor WebView
        └── loads  https://moswords.vercel.app
              └── Next.js API routes  →  Neon database
```

---

## Prerequisites

Install these once on your machine:

| Tool | Install |
|------|---------|
| Node.js 20+ | Already installed |
| Java 17 (JDK) | https://adoptium.net  — or `winget install EclipseAdoptium.Temurin.17.JDK` |
| Android Studio | https://developer.android.com/studio  (installs Android SDK + build tools) |
| Gradle | Included via `gradlew` — no separate install needed |

After installing Android Studio, open **SDK Manager** and make sure:
- Android SDK Platform **API 36** is installed
- **Android SDK Build-Tools 36** is installed

---

## Step 1 — Deploy the backend

The APK needs a live backend URL. Deploy to Vercel:

```bash
# From the project root
npx vercel --prod
```

After deploying, copy the URL (e.g. `https://moswords.vercel.app`).

Set it as an environment variable for the build, **or** edit `capacitor.config.ts` directly:

```ts
const PRODUCTION_URL = 'https://YOUR-REAL-URL.vercel.app';
```

Also update your Vercel env vars:
- `NEXTAUTH_URL` → your Vercel URL
- All other vars from `.env.local`

---

## Step 2 — Create a signing keystore (ONE TIME ONLY)

```bash
npm run keystore:create
```

When prompted:
- **First and last name**: Moswords (or your name)
- **Organizational unit**: Mobile
- **Organization**: Moswords
- **Validity**: 10000 days (already set)
- **Key password**: choose a strong password
- **Store password**: choose a strong password (can be same as key password)

⚠️  **Back up `android/keystore/moswords-release.keystore` somewhere safe.**
     If you lose it, you can never update the app on the Play Store.

Then copy the template and fill in your passwords:

```bash
copy android\keystore.properties.template android\keystore.properties
# Edit keystore.properties and replace CHANGE_ME with your actual passwords
```

---

## Step 3 — Build the debug APK (for testing)

Good for sideloading to your phone without a keystore:

```powershell
# Sync Capacitor config then build
npx cap sync
cd android
.\gradlew.bat assembleDebug
```

Output: `android\app\build\outputs\apk\debug\app-debug.apk`

Transfer to phone and install (enable "Install from unknown sources" in Settings → Security).

---

## Step 4 — Build the release APK (for distribution)

```powershell
$env:CAPACITOR_BUILD_MODE = "prod"
npx cap sync
cd android
.\gradlew.bat assembleRelease
```

Or use the npm script (PowerShell):
```powershell
$env:CAPACITOR_BUILD_MODE = "prod"
npm run apk:release
```

Output: `android\app\build\outputs\apk\release\app-release.apk`

This APK is signed and can be shared for direct download (sideload).

---

## Step 5 — Build an AAB for Google Play Store

Google Play **requires** an App Bundle (`.aab`) instead of an APK:

```powershell
$env:CAPACITOR_BUILD_MODE = "prod"
cd android
.\gradlew.bat bundleRelease
```

Output: `android\app\build\outputs\bundle\release\app-release.aab`

Upload this `.aab` file to the Google Play Console.

---

## Step 6 — Install on your Android phone (debug APK)

### Option A — USB (recommended)
1. Enable **Developer Options** on your phone (Settings → About → tap Build Number 7×)
2. Enable **USB Debugging**
3. Connect USB cable
4. Run: `npx cap run android`  (installs + launches automatically)

### Option B — File transfer
1. Copy `app-debug.apk` to your phone
2. Open the file from Files app
3. Allow "Install unknown apps" for your file manager

### Option C — Share via link
Upload the APK to Google Drive / Cloudflare R2 and share the download link.

---

## Updating the app

When you push new code to Vercel, the APK automatically gets the new version
**without needing a new APK build** (since the WebView loads from the server URL).

You only need to rebuild and redistribute the APK when you change:
- Native plugins
- Capacitor config
- AndroidManifest.xml
- App icons / splash screen

---

## App icon & splash screen

Put your icon files in the respective `mipmap-*` folders:

```
android/app/src/main/res/
  mipmap-mdpi/     ic_launcher.png        48×48 px
  mipmap-hdpi/     ic_launcher.png        72×72 px
  mipmap-xhdpi/    ic_launcher.png        96×96 px
  mipmap-xxhdpi/   ic_launcher.png       144×144 px
  mipmap-xxxhdpi/  ic_launcher.png       192×192 px
                   ic_launcher_round.png  (same sizes, circular crop)
```

Or use the **Image Asset Studio** in Android Studio (File → New → Image Asset).

---

## Google Play Store checklist

Before submitting:
- [ ] Increment `versionCode` and `versionName` in `android/app/build.gradle`
- [ ] AAB built with release keystore
- [ ] App tested on real device
- [ ] Screenshots (phone + 7" tablet) taken
- [ ] Privacy policy URL ready
- [ ] Content rating questionnaire completed in Play Console
- [ ] Target API level = 36 (required by Google)

---

## Apple App Store (iOS)

Requires a Mac with Xcode. The iOS project is in `ios/`. The process is similar:
1. `npx cap open ios` — opens Xcode
2. Set your Apple Developer Team in Signing & Capabilities
3. Archive → Distribute

---

## Environment variables on device

The app loads env vars from the **server** (Vercel), not from the device.
Update env vars in your Vercel project dashboard, not `.env.local`.

The only thing the device holds is:
- The server URL (baked into `capacitor.config.ts` at sync time)
- Local IDB cache (messages, conversations)
- Auth token (stored in the WebView cookie jar)
