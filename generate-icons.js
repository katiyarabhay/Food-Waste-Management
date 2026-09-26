const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconSrc = path.join(__dirname, 'assets', 'images', 'Untitled design (1).png');
const resDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

if (!fs.existsSync(iconSrc)) {
  console.error('Source icon not found at:', iconSrc);
  process.exit(1);
}

const sizes = [
  { dir: 'mipmap-mdpi', size: 48, fgSize: 108 },
  { dir: 'mipmap-hdpi', size: 72, fgSize: 162 },
  { dir: 'mipmap-xhdpi', size: 96, fgSize: 216 },
  { dir: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
  { dir: 'mipmap-xxxhdpi', size: 192, fgSize: 432 }
];

async function generateIcons() {
  console.log('🖼️ Generating Android app icons from website favicon...');

  for (const item of sizes) {
    const targetFolder = path.join(resDir, item.dir);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    // Standard Launcher Icon
    await sharp(iconSrc)
      .resize(item.size, item.size)
      .png()
      .toFile(path.join(targetFolder, 'ic_launcher.png'));

    // Round Launcher Icon
    await sharp(iconSrc)
      .resize(item.size, item.size)
      .png()
      .toFile(path.join(targetFolder, 'ic_launcher_round.png'));

    // Foreground Icon (for adaptive icons)
    await sharp(iconSrc)
      .resize(item.fgSize, item.fgSize)
      .png()
      .toFile(path.join(targetFolder, 'ic_launcher_foreground.png'));

    console.log(`Generated icons for ${item.dir} (${item.size}x${item.size})`);
  }

  console.log('✅ All Android launcher icons successfully updated!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
