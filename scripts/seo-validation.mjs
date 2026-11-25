import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const robots = readFileSync('robots.txt', 'utf8');
const sitemap = readFileSync('sitemap.xml', 'utf8');
const base = 'https://arezosaleh040-wq.github.io/CYBER-ARCADIA/';
const canonical = html.match(/<link\\b(?=[^>]*\\brel=["']canonical["'])(?=[^>]*\\bhref=["']([^"']+)["'])[^>]*>/i)?.[1];

assert.equal(canonical, base, 'Canonical URL must match the GitHub Pages homepage.');
assert.match(html, /<title>[^<]{10,}<\\/title>/i, 'A descriptive page title is required.');
assert.match(html, /<meta\\s+name=["']description["'][^>]*content=["'][^"']{50,}["']/i, 'A useful meta description is required.');
assert.match(html, /<meta\\s+name=["']robots["'][^>]*content=["']index,\\s*follow["']/i, 'Homepage must be indexable.');
assert.match(html, /<meta\\s+property=["']og:title["']/i, 'Open Graph title is required.');
assert.match(html, /<meta\\s+property=["']og:description["']/i, 'Open Graph description is required.');
assert.match(html, /<meta\\s+property=["']og:url["'][^>]*content=["']https:\\/\\/arezosaleh040-wq\\.github\\.io\\/CYBER-ARCADIA\\//i, 'Open Graph URL must use the canonical site.');
assert.equal((html.match(/<link\\b[^>]*\\brel=["']icon["']/gi) || []).length, 1, 'Exactly one standard favicon declaration should exist.');
assert.match(robots, /^User-agent:\\s*\\*/m);
assert.match(robots, /^Allow:\\s*\\/$/m);
assert.match(robots, new RegExp('^Sitemap:\\\\s*' + base.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&') + 'sitemap\\\\.xml$', 'm'));
assert.match(sitemap, /<urlset\\b[^>]*xmlns=["']https:\\/\\/www\\.sitemaps\\.org\\/schemas\\/sitemap\\/0\\.9["']/i);
assert.match(sitemap, new RegExp('<loc>' + base.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&') + '<\\\\/loc>'));
assert.doesNotMatch(sitemap, /\\/admin\\//i);
assert.ok(existsSync('robots.txt') && existsSync('sitemap.xml'));
console.log('SEO validation passed: metadata, canonical URL, robots.txt, sitemap.xml and single favicon.');
