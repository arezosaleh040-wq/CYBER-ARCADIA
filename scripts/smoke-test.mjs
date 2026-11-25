import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const root = process.cwd();
const htmlPath = resolve(root, 'index.html');
const html = readFileSync(htmlPath, 'utf8');
const jsPath = resolve(root, 'assets/js/app.js');
const js = readFileSync(jsPath, 'utf8');

assert.match(html, /<html[^>]*lang=["']fa["']/i, 'The document should declare Persian language.');
assert.match(html, /<html[^>]*dir=["']rtl["']/i, 'The document should use RTL direction.');
assert.match(html, /name=["']viewport["']/i, 'A responsive viewport is required.');

const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
assert.deepEqual(duplicates, [], 'HTML IDs must be unique.');

for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) {
  const asset = match[1];
  if (/^(?:https?:|data:|#|mailto:|tel:)/i.test(asset)) continue;
  const localPath = resolve(dirname(htmlPath), asset.split(/[?#]/)[0]);
  assert.ok(existsSync(localPath), `Missing local asset: ${asset}`);
}

for (const match of js.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)) {
  assert.ok(ids.includes(match[1]), `JavaScript references missing HTML id: ${match[1]}`);
}

const declaredFunctions = new Set([...js.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((match) => match[1]));
for (const match of html.matchAll(/\bonclick=["']\s*([A-Za-z_$][\w$]*)\s*\(/g)) {
  assert.ok(declaredFunctions.has(match[1]), `Inline click handler has no matching function: ${match[1]}`);
}

console.log('Smoke tests passed: HTML structure, unique IDs, local assets and DOM/function references.');

const manifestPath = resolve(root, 'manifest.webmanifest');
const workerPath = resolve(root, 'service-worker.js');
const pwaPath = resolve(root, 'assets/js/pwa.js');
assert.ok(existsSync(manifestPath), 'PWA manifest must exist.');
assert.ok(existsSync(workerPath), 'Service worker must exist.');
assert.ok(existsSync(pwaPath), 'PWA enhancement script must exist.');
assert.match(html, /rel=["']manifest["']/i, 'Manifest must be linked.');
assert.match(html, /id=["']gameGrid["']/i, 'Game grid must have a stable id.');
assert.match(html, /id=["']gameSearch["']/i, 'Game search must be available.');
JSON.parse(readFileSync(manifestPath, 'utf8'));
console.log('PWA checks passed: manifest, worker, search and offline assets.');

const robotsPath = resolve(root, 'robots.txt');
const sitemapPath = resolve(root, 'sitemap.xml');
const adminPath = resolve(root, 'admin/index.html');
assert.ok(existsSync(robotsPath), 'robots.txt must exist at the site root.');
assert.ok(existsSync(sitemapPath), 'sitemap.xml must exist at the site root.');
assert.ok(existsSync(adminPath), 'The local admin page must exist.');
const robots = readFileSync(robotsPath, 'utf8');
const sitemap = readFileSync(sitemapPath, 'utf8');
const adminHtml = readFileSync(adminPath, 'utf8');
const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1];
assert.ok(canonical, 'Homepage must declare a canonical URL.');
assert.match(robots, /^User-agent:\s*\*/m, 'robots.txt must define a crawler policy.');
assert.match(robots, /^Allow:\s*\/$/m, 'The public site must remain crawlable.');
assert.match(robots, /^Sitemap:\s*https:\/\/arezosaleh040-wq\.github\.io\/CYBER-ARCADIA\/sitemap\.xml$/m, 'robots.txt must advertise the canonical sitemap.');
assert.match(sitemap, /<urlset\b/, 'Sitemap must be a URL set.');
assert.match(sitemap, new RegExp('<loc>' + canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '<\\/loc>'), 'Sitemap must include the homepage canonical URL.');
assert.doesNotMatch(sitemap, /\/admin\//i, 'The local command center must not be submitted for indexing.');
assert.match(adminHtml, /name=["']robots["'][^>]*content=["']noindex,\s*follow["']/i, 'The local command center must be excluded from search indexing.');
assert.match(html, /name=["']description["']/i, 'Homepage must have a meta description.');
assert.match(html, /property=["']og:title["']/i, 'Homepage must have social sharing metadata.');
console.log('SEO checks passed: crawl rules, canonical homepage, sitemap and admin noindex.');
