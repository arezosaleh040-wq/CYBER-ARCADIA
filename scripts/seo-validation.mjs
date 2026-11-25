import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const robots = readFileSync('robots.txt', 'utf8');
const sitemap = readFileSync('sitemap.xml', 'utf8');
const base = 'https://arezosaleh040-wq.github.io/CYBER-ARCADIA/';

assert.match(html, /<link\b(?=[^>]*\brel=["']canonical["'])(?=[^>]*\bhref=["']https:\/\/arezosaleh040-wq\.github\.io\/CYBER-ARCADIA\/["'])[^>]*>/i);
assert.match(html, /<title>[^<]{10,}<\/title>/i);
assert.match(html, /<meta\s+name=["']description["'][^>]*content=["'][^"']{50,}["']/i);
assert.match(html, /<meta\s+name=["']robots["'][^>]*content=["']index,\s*follow(?:,|["'])/i);
assert.match(html, /<meta\s+property=["']og:title["']/i);
assert.match(html, /<meta\s+property=["']og:description["']/i);
assert.ok(html.includes('<meta property="og:url" content="' + base + '">'));
assert.equal((html.match(/<link\b[^>]*\brel=["']icon["']/gi) || []).length, 1, 'Exactly one standard favicon declaration should exist.');
assert.match(robots, /^User-agent:\s*\*/m);
assert.match(robots, /^Allow:\s*\/$/m);
assert.ok(robots.includes('Sitemap: ' + base + 'sitemap.xml'));
assert.match(sitemap, /<urlset\b[^>]*xmlns=["']http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9["']/i);
assert.ok(sitemap.includes('<loc>' + base + '</loc>'), 'Sitemap must include the canonical homepage.');
assert.doesNotMatch(sitemap, /\/admin\//i);
assert.ok(existsSync('robots.txt') && existsSync('sitemap.xml'));
console.log('SEO validation passed: metadata, canonical URL, robots.txt, sitemap.xml and single favicon.');
