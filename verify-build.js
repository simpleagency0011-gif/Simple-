const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

// Find all img src attributes
const matches = [...indexHtml.matchAll(/src="([^"]+)"/g)].map(m => m[1]);
console.log('Image references in index.html:', matches);

let allValid = true;
for (const src of matches) {
  if (src.startsWith('http') || src.startsWith('data:')) continue;
  const p = path.join(__dirname, src);
  if (fs.existsSync(p)) {
    const stats = fs.statSync(p);
    console.log(`✓ ${src} (${stats.size} bytes)`);
  } else {
    console.error(`✗ MISSING: ${src}`);
    allValid = false;
  }
}

if (allValid) {
  console.log('🎉 ALL IMAGES VERIFIED AND PRESENT!');
} else {
  console.error('❌ SOME IMAGES ARE MISSING!');
  process.exit(1);
}
