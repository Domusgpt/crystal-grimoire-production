#!/bin/bash
set -e

echo "======================================"
echo "🔮 CRYSTAL GRIMOIRE COMPLETE DEPLOYMENT"
echo "======================================"
echo ""
echo "This script will:"
echo "1. Build Flutter web app with proper config"
echo "2. Deploy all Cloud Functions"
echo "3. Deploy Firestore rules"
echo "4. Deploy to Firebase Hosting"
echo "5. Build Android APK with OAuth"
echo ""
read -p "Press Enter to start deployment..."

# Change to project directory
cd /mnt/c/Users/millz/crystal-grimoire-fresh-DEPLOY

echo ""
echo "======================================"
echo "STEP 1: Clean and Build Flutter Web"
echo "======================================"
flutter clean
flutter pub get
flutter build web --release

echo "✅ Flutter web build complete"

echo ""
echo "======================================"
echo "STEP 2: Deploy Firestore Security Rules"
echo "======================================"
firebase deploy --only firestore:rules --project crystal-grimoire-2025

echo "✅ Firestore rules deployed"

echo ""
echo "======================================"
echo "STEP 3: Deploy ALL Cloud Functions"
echo "======================================"
FUNCTIONS_DISCOVERY_TIMEOUT=120000 firebase deploy --only functions --project crystal-grimoire-2025

echo "✅ All functions deployed"

echo ""
echo "======================================"
echo "STEP 4: Deploy Firebase Hosting"
echo "======================================"
firebase deploy --only hosting --project crystal-grimoire-2025

echo "✅ Web app deployed to hosting"

echo ""
echo "======================================"
echo "STEP 5: Build Android APK"
echo "======================================"
echo "Building release APK with OAuth configured..."
flutter build apk --release

echo "✅ Android APK built successfully"
echo "📱 APK location: build/app/outputs/flutter-apk/app-release.apk"

echo ""
echo "======================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo "======================================"
echo ""
echo "🌐 Live Site: https://crystal-grimoire-2025.web.app"
echo "📱 Android APK: build/app/outputs/flutter-apk/app-release.apk"
echo ""
echo "Next steps:"
echo "1. Test OAuth on web: https://crystal-grimoire-2025.web.app"
echo "2. Install APK on Android device and test OAuth"
echo "3. Test subscription flow with test card: 4242 4242 4242 4242"
echo ""
