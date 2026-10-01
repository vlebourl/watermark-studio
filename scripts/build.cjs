const esbuild = require('esbuild');
const fs = require('node:fs');
fs.mkdirSync('dist', { recursive: true });
fs.copyFileSync('src/index.html', 'dist/index.html');
fs.cpSync('assets', 'dist/assets', {recursive:true});
esbuild.buildSync({entryPoints: ['src/app.jsx'], bundle: true, outfile: 'dist/app.js', minify: false, sourcemap: true, loader: {'.css': 'css'}});
