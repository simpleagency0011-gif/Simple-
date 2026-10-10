const fs = require('fs');
const path = require('path');

const parts = [
  'parts/head.html',
  'parts/nav-hero-mission.html',
  'parts/solutions-work-press.html',
  'parts/packages-compare.html',
  'parts/testimonials-contact-footer.html',
  'parts/drawer-scripts.html'
];

console.log('Assembling index.html from parts...');
const fullHtml = parts.map(p => {
  const fullPath = path.join(__dirname, p);
  if (!fs.existsSync(fullPath)) {
    throw new Error('Missing part: ' + fullPath);
  }
  return fs.readFileSync(fullPath, 'utf8');
}).join('\n');

const targetPath = path.join(__dirname, 'index.html');
fs.writeFileSync(targetPath, fullHtml, 'utf8');
console.log('Successfully written index.html! Bytes:', Buffer.byteLength(fullHtml, 'utf8'));
