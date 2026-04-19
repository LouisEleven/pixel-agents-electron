const { execSync } = require('child_process');
const path = require('path');

const electronVersion = require('../node_modules/electron/package.json').version;
const electronVersionStr = electronVersion.replace(/(\d+)\.(\d+)\.(\d+)/, '$1.$2.$3');

console.log('[Rebuild] Rebuilding native modules for Electron', electronVersion);

try {
  execSync(`npx electron-rebuild -f -w node-pty`, {
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_OVERRIDE_DIST_PATH: require('electron').path },
  });
  console.log('[Rebuild] Done');
} catch (e) {
  console.error('[Rebuild] Failed:', e.message);
  process.exit(1);
}
