#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('📱 Building VelocityRush3D for mobile...\n');

// Check if Cordova is installed
try {
  execSync('cordova --version', { stdio: 'pipe' });
} catch (error) {
  console.error('❌ Cordova is not installed. Install with: npm install -g cordova');
  process.exit(1);
}

console.log('✅ Cordova found');

// Clean previous builds
if (fs.existsSync('platforms')) {
  console.log('🧹 Cleaning previous builds...');
  execSync('cordova clean', { stdio: 'inherit' });
}

// Build web assets
console.log('📦 Building web assets...');
execSync('npm run build:prod', { stdio: 'inherit' });

// Copy built files to www directory
if (!fs.existsSync('www')) {
  fs.mkdirSync('www');
}

console.log('📋 Copying files to www...');
execSync('cp -r dist/* www/', { stdio: 'inherit' });

// Update config.xml with version
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const configPath = 'cordova.config.xml';

if (fs.existsSync(configPath)) {
  let config = fs.readFileSync(configPath, 'utf8');
  config = config.replace(/version="[^"]*"/, `version="${packageJson.version}"`);
  fs.writeFileSync(configPath, config);
  console.log(`📝 Updated version to ${packageJson.version}`);
}

// Build for platforms
const platforms = process.argv.slice(2);

if (platforms.length === 0) {
  console.log('🤔 No platforms specified. Building for both iOS and Android...');
  platforms.push('ios', 'android');
}

for (const platform of platforms) {
  console.log(`\n📱 Building for ${platform}...`);

  try {
    // Add platform if not exists
    if (!fs.existsSync(`platforms/${platform}`)) {
      console.log(`➕ Adding ${platform} platform...`);
      execSync(`cordova platform add ${platform}`, { stdio: 'inherit' });
    }

    // Build
    console.log(`🔨 Building ${platform} app...`);
    execSync(`cordova build ${platform} --release`, { stdio: 'inherit' });

    console.log(`✅ ${platform} build completed!`);

    // Show output location
    const outputPath = platform === 'ios' ?
      'platforms/ios/build/device/VelocityRush3D.ipa' :
      'platforms/android/app/build/outputs/apk/release/app-release.apk';

    if (fs.existsSync(outputPath)) {
      console.log(`📁 Output: ${outputPath}`);
    }

  } catch (error) {
    console.error(`❌ Failed to build for ${platform}:`, error.message);
  }
}

console.log('\n🎉 Mobile builds completed!');
console.log('\n📋 Next steps:');
console.log('1. Sign and distribute iOS app via App Store Connect');
console.log('2. Sign and distribute Android app via Google Play Console');
console.log('3. Test on physical devices before release');

// Create build summary
const summary = {
  buildTime: new Date().toISOString(),
  version: packageJson.version,
  platforms: platforms,
  cordovaVersion: execSync('cordova --version', { encoding: 'utf8' }).trim(),
  nodeVersion: process.version
};

fs.writeFileSync('mobile-build-summary.json', JSON.stringify(summary, null, 2));
console.log('📊 Build summary saved to mobile-build-summary.json');