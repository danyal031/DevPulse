const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');
const isProduction = process.argv.includes('--production');

async function build() {
  const distDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Copy CSS to dist
  fs.copyFileSync(
    path.join(__dirname, 'src', 'webview', 'styles.css'),
    path.join(distDir, 'webview.css')
  );

  const extensionConfig = {
    entryPoints: [path.join(__dirname, 'src', 'extension.ts')],
    bundle: true,
    outfile: path.join(distDir, 'extension.js'),
    external: ['vscode'],
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    sourcemap: !isProduction,
    minify: isProduction
  };

  const webviewConfig = {
    entryPoints: [path.join(__dirname, 'src', 'webview', 'main.ts')],
    bundle: true,
    outfile: path.join(distDir, 'webview.js'),
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    sourcemap: !isProduction,
    minify: isProduction
  };

  if (isWatch) {
    const extCtx = await esbuild.context(extensionConfig);
    const webviewCtx = await esbuild.context(webviewConfig);
    await Promise.all([extCtx.watch(), webviewCtx.watch()]);
    console.log('Watching for changes in extension and webview...');
  } else {
    await Promise.all([
      esbuild.build(extensionConfig),
      esbuild.build(webviewConfig)
    ]);
    console.log('Build completed successfully.');
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
