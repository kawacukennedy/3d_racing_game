#!/bin/bash

# VelocityRush3D Mobile Build Preparation Script

set -e

echo "📱 Preparing VelocityRush3D for mobile deployment..."

# Check if Cordova is installed
if ! command -v cordova &> /dev/null; then
    echo "❌ Cordova is not installed."
    echo "📦 Installing Cordova globally..."
    npm install -g cordova
fi

echo "✅ Cordova found: $(cordova --version)"

# Clean previous builds
if [ -d "platforms" ]; then
    echo "🧹 Cleaning previous builds..."
    cordova clean
fi

# Build web assets
echo "📦 Building web assets..."
npm run build:prod

# Create www directory if it doesn't exist
if [ ! -d "www" ]; then
    mkdir -p www
fi

# Copy built files to www directory
echo "📋 Copying files to www..."
cp -r dist/* www/

# Update config.xml with current version
PACKAGE_VERSION=$(node -p "require('./package.json').version")
sed -i.bak "s/version=\"[^\"]*\"/version=\"$PACKAGE_VERSION\"/" cordova.config.xml
rm cordova.config.xml.bak

echo "📝 Updated version to $PACKAGE_VERSION"

# Create res directory structure for icons and splash screens
echo "🎨 Creating resource directories..."
mkdir -p res/icons/{ios,android}
mkdir -p res/screens/{ios,android}

# Create placeholder icons and splash screens
echo "🖼️  Creating placeholder icons and splash screens..."

# iOS icons
convert -size 57x57 xc:"#FF6B35" res/icons/ios/icon.png 2>/dev/null || echo "⚠️  ImageMagick not found, skipping icon generation"
convert -size 114x114 xc:"#FF6B35" res/icons/ios/icon@2x.png 2>/dev/null || true
convert -size 120x120 xc:"#FF6B35" res/icons/ios/icon-60@2x.png 2>/dev/null || true
convert -size 180x180 xc:"#FF6B35" res/icons/ios/icon-60@3x.png 2>/dev/null || true

# Android icons
convert -size 48x48 xc:"#FF6B35" res/icons/android/icon-48-mdpi.png 2>/dev/null || true
convert -size 72x72 xc:"#FF6B35" res/icons/android/icon-72-hdpi.png 2>/dev/null || true
convert -size 96x96 xc:"#FF6B35" res/icons/android/icon-96-xhdpi.png 2>/dev/null || true
convert -size 144x144 xc:"#FF6B35" res/icons/android/icon-144-xxhdpi.png 2>/dev/null || true
convert -size 192x192 xc:"#FF6B35" res/icons/android/icon-192-xxxhdpi.png 2>/dev/null || true

# Splash screens
convert -size 640x1136 xc:"#1E3A8A" res/screens/ios/Default-568h@2x~iphone.png 2>/dev/null || true
convert -size 750x1334 xc:"#1E3A8A" res/screens/ios/Default-667h.png 2>/dev/null || true
convert -size 1242x2208 xc:"#1E3A8A" res/screens/ios/Default-736h.png 2>/dev/null || true

convert -size 800x480 xc:"#1E3A8A" res/screens/android/splash-land-mdpi.png 2>/dev/null || true
convert -size 1200x720 xc:"#1E3A8A" res/screens/android/splash-land-hdpi.png 2>/dev/null || true
convert -size 1600x960 xc:"#1E3A8A" res/screens/android/splash-land-xhdpi.png 2>/dev/null || true
convert -size 480x800 xc:"#1E3A8A" res/screens/android/splash-port-mdpi.png 2>/dev/null || true
convert -size 720x1200 xc:"#1E3A8A" res/screens/android/splash-port-hdpi.png 2>/dev/null || true
convert -size 960x1600 xc:"#1E3A8A" res/screens/android/splash-port-xhdpi.png 2>/dev/null || true

echo "📱 Mobile preparation complete!"
echo ""
echo "🚀 Next steps:"
echo "1. Add iOS platform: cordova platform add ios"
echo "2. Add Android platform: cordova platform add android"
echo "3. Build for iOS: cordova build ios --release"
echo "4. Build for Android: cordova build android --release"
echo ""
echo "📋 For app store submission:"
echo "- iOS: Use Xcode to archive and upload to App Store Connect"
echo "- Android: Sign and upload APK/AAB to Google Play Console"