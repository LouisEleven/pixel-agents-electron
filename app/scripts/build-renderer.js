const path = require('path');

async function loadEsbuild() {
  try {
    return require('esbuild');
  } catch {
    return require('../../node_modules/esbuild');
  }
}

async function buildRenderer() {
  const esbuild = await loadEsbuild();

  const outfile = path.join(__dirname, '..', 'dist', 'renderer', 'main.js');

  await esbuild.build({
    entryPoints: [path.join(__dirname, '..', 'src', 'renderer', 'main.tsx')],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['chrome120'],
    jsx: 'automatic',
    sourcemap: 'inline',
    loader: {
      '.ts': 'ts',
      '.tsx': 'tsx',
    },
  });

  console.log('✓ Bundled renderer');
}

buildRenderer().catch((error) => {
  console.error(error);
  process.exit(1);
});
