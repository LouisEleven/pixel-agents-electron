const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'bin', 'pixel-agents.js');
const dst = path.join(__dirname, '..', 'dist', 'bin', 'pixel-agents.js');

// Copy CLI script to dist
const distBin = path.dirname(dst);
if (!fs.existsSync(distBin)) {
  fs.mkdirSync(distBin, { recursive: true });
}

if (fs.existsSync(src)) {
  fs.copyFileSync(src, dst);
  // Make it executable
  fs.chmodSync(dst, 0o755);
  console.log('✓ Built CLI');
}
