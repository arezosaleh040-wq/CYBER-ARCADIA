import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const pwa = readFileSync('assets/js/pwa.js', 'utf8');
const worker = readFileSync('service-worker.js', 'utf8');
const manifest = JSON.parse(readFileSync('manifest.webmanifest', 'utf8'));

assert.equal(manifest.start_url, './');
assert.equal(manifest.scope, './');
assert.equal(manifest.dir, 'rtl');
assert.equal(manifest.lang, 'fa');
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0);
for (const icon of manifest.icons) {
  const path = icon.src.replace(/^\.\//, '');
  assert.ok(existsSync(path), 'Missing manifest icon: ' + icon.src);
}
assert.match(html, /<link\s+rel=["']manifest["']\s+href=["']manifest\.webmanifest["']/i);
assert.ok(html.includes('assets/js/pwa.js'));
assert.match(pwa, /navigator\.serviceWorker\.register\(['"]\.\/service-worker\.js['"]/);
assert.match(pwa, /beforeinstallprompt/);
assert.match(worker, /addEventListener\(['"]install['"]/);
assert.match(worker, /addEventListener\(['"]activate['"]/);
assert.match(worker, /addEventListener\(['"]fetch['"]/);
assert.match(worker, /skipWaiting/);
assert.match(worker, /clients\.claim/);
const precache = [...worker.matchAll(/['"]((?:\.\/)[^'"]+)['"]/g)].map(match => match[1]);
for (const asset of precache) {
  const path = asset.replace(/^\.\//, '').replace(/\/$/, '');
  if (path && !path.includes('://')) assert.ok(existsSync(path) || existsSync(path + '/index.html'), 'Missing precache asset: ' + asset);
}
console.log('PWA validation passed: manifest, icons, registration, lifecycle, fetch handler and precache assets.');
