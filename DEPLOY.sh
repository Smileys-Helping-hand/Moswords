#!/bin/bash

# MOSWORDS - QUICK DEPLOYMENT GUIDE
# Run deployment scripts with: bash DEPLOY.sh

echo "🚀 MOSWORDS DEPLOYMENT MENU"
echo "================================"
echo ""
echo "1. Start dev server (local testing)"
echo "2. Build for production (web)"
echo "3. Run Lighthouse audit"
echo "4. Install on Android device (debug APK)"
echo "5. Submit to Google Play (release APK)"
echo "6. Deploy to Firebase Hosting"
echo ""
read -p "Choose option (1-6): " choice

case $choice in
  1)
    echo "Starting dev server..."
    npm run dev
    ;;
  2)
    echo "Building for production..."
    npm run build
    echo "✅ Production build complete!"
    echo "Start with: npm start"
    ;;
  3)
    echo "Running Lighthouse audit..."
    npm start &
    sleep 5
    lighthouse http://localhost:3000 --view
    ;;
  4)
    echo "Building debug APK..."
    npm run apk:debug
    echo "✅ Debug APK ready: ./apk/Moswords.apk"
    echo "Install with: adb install ./apk/Moswords.apk"
    ;;
  5)
    echo "Building release APK..."
    npm run apk:release
    echo "✅ Release APK ready: ./apk/Moswords-release.apk"
    echo "Submit to Google Play Store"
    ;;
  6)
    echo "Deploying to Firebase..."
    firebase login
    firebase deploy
    echo "✅ Deployed to Firebase Hosting!"
    ;;
  *)
    echo "Invalid option"
    exit 1
    ;;
esac
