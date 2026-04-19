const fs = require('fs');
const path = require('path');

const distRenderer = path.join(__dirname, '..', 'dist', 'renderer');
const srcRenderer = path.join(__dirname, '..', 'src', 'renderer');

if (!fs.existsSync(distRenderer)) {
  fs.mkdirSync(distRenderer, { recursive: true });
}

// Copy index.html
const srcHtml = path.join(srcRenderer, 'index.html');
const distHtml = path.join(distRenderer, 'index.html');
if (fs.existsSync(srcHtml)) {
  fs.copyFileSync(srcHtml, distHtml);
  console.log('✓ Copied index.html');
}
