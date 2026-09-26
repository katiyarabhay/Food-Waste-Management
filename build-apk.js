const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎨 0. Generating app icons from website favicon...');
require('./generate-icons.js');

console.log('🔄 1. Preparing web assets in www/...');
require('./build-www.js');

console.log('📱 2. Syncing assets into Android native project...');
execSync('npx cap sync android', { stdio: 'inherit' });

console.log('🔨 3. Compiling new APK with Gradle (JDK 23)...');
const env = { ...process.env, JAVA_HOME: 'C:\\Program Files\\Java\\jdk-23' };
execSync('.\\gradlew.bat assembleDebug', {
  cwd: path.join(__dirname, 'android'),
  env,
  stdio: 'inherit'
});

console.log('📦 4. Updating root HappiPlates.apk file...');
const srcApk = path.join(__dirname, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const destApk = path.join(__dirname, 'HappiPlates.apk');
if (fs.existsSync(srcApk)) {
  fs.copyFileSync(srcApk, destApk);
  console.log('✅ Successfully compiled and updated HappiPlates.apk in project root!');
} else {
  console.error('❌ Could not find output app-debug.apk');
}
