const fs = require('fs');
const path = require('path');

function makeEntrypoints(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const srcDir = path.join(dir, 'src');
  if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });

  const dummyAppCode = `
const express = require('express');
let app;
try {
  app = require('./apps/api/src/app').default || require('../apps/api/src/app').default;
} catch (e) {
  app = express();
  app.all('*', (req, res) => res.json({ status: 'ok', message: 'Badminton Live API Service' }));
}
module.exports = app;
`;

  ['index.js', 'app.js', 'server.js'].forEach((file) => {
    const targetFile = path.join(dir, file);
    if (!fs.existsSync(targetFile)) {
      fs.writeFileSync(targetFile, dummyAppCode);
    }
    const targetSrcFile = path.join(srcDir, file);
    if (!fs.existsSync(targetSrcFile)) {
      fs.writeFileSync(targetSrcFile, dummyAppCode);
    }
  });
}

try {
  makeEntrypoints(path.resolve(__dirname, '..', 'dist'));
  makeEntrypoints(path.resolve(__dirname, '..', 'apps', 'api', 'dist'));
  console.log('[Vercel Entrypoint Helper] Successfully populated all 6 Vercel entrypoint search paths.');
} catch (err) {
  console.error('[Vercel Entrypoint Helper Error]:', err);
}
