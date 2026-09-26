const fs = require('fs');
const path = require('path');

const wwwDir = path.join(__dirname, 'www');

// Ensure www directory exists and is clean
if (fs.existsSync(wwwDir)) {
  fs.rmSync(wwwDir, { recursive: true, force: true });
}
fs.mkdirSync(wwwDir, { recursive: true });

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else if (exists) {
    fs.copyFileSync(src, dest);
  }
}

// Copy HTML files, JS, CSS, and assets folder
const itemsToCopy = [
  'index.html',
  'admin.html',
  'delivery.html',
  'feed.html',
  'login.html',
  'my-account.html',
  'firebase-config.js',
  'script.js',
  'assets'
];

itemsToCopy.forEach((item) => {
  const srcPath = path.join(__dirname, item);
  const destPath = path.join(wwwDir, item);
  if (fs.existsSync(srcPath)) {
    copyRecursiveSync(srcPath, destPath);
    console.log(`Copied ${item} -> www/${item}`);
  }
});

console.log('Successfully prepared www directory for Capacitor!');
