#!/bin/bash
# Moswords APK Installation Script

APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
PACKAGE_NAME="com.moswords.app"

echo "================================================"
echo "Moswords APK Installation"
echo "================================================"
echo ""
echo "APK: $APK_PATH"
echo "Package: $PACKAGE_NAME"
echo "Size: 5.1 MB"
echo ""

# Check if APK exists
if [ ! -f "$APK_PATH" ]; then
    echo "❌ APK not found at $APK_PATH"
    echo "   Please run: npm run build && npx cap sync android && ./gradlew assembleRelease"
    exit 1
fi

echo "1️⃣  Checking for connected devices..."
adb devices

echo ""
echo "2️⃣  Uninstalling old version (if exists)..."
adb uninstall $PACKAGE_NAME 2>/dev/null || true

echo ""
echo "3️⃣  Installing APK..."
adb install "$APK_PATH"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Installation successful!"
    echo ""
    echo "4️⃣  Launching app..."
    adb shell am start -n $PACKAGE_NAME/.MainActivity
    echo ""
    echo "🎉 App launched!"
    echo ""
    echo "📊 To view logs: adb logcat | grep Moswords"
else
    echo ""
    echo "❌ Installation failed!"
    echo ""
    echo "Troubleshooting:"
    echo "- Enable USB Debugging on your device (Settings > Developer Options)"
    echo "- Check that device is connected: adb devices"
    echo "- Try: adb kill-server && adb start-server"
fi
