/**
 * Compliance Test Suite for Teleprompter Architecture Principles:
 * - 0 Third-Party Dependencies (zero runtime npm packages)
 * - 0 External CDNs / Fonts / Remote Scripts (100% self-hosted & offline)
 * - 0 Telemetry / Trackers / Analytics (100% private)
 * - PWA & Service Worker Precache Integrity
 *
 * Run with Node.js: node tests/compliance.test.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = path.resolve(import.meta.dirname, '..');

console.log('🧪 Starting architectural compliance and privacy tests...');

// Test 1: Zero runtime dependencies in package.json
const pkgPath = path.join(ROOT_DIR, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const runtimeDeps = Object.keys(pkg.dependencies || {});
assert.equal(
  runtimeDeps.length,
  0,
  `Project must have ZERO runtime dependencies. Found: ${runtimeDeps.join(', ')}`
);
console.log('✓ Zero third-party runtime dependencies verified');

// Test 2: Scan HTML files for external CDN scripts and stylesheets
const htmlFiles = fs.readdirSync(ROOT_DIR).filter((f) => f.endsWith('.html'));
assert.ok(htmlFiles.length > 0, 'Must have at least one HTML file');

for (const file of htmlFiles) {
  const content = fs.readFileSync(path.join(ROOT_DIR, file), 'utf8');

  // Check external scripts
  const scriptRegex = /<script\b[^>]*\bsrc=["']([^"']+)["']/gi;
  let match;
  while ((match = scriptRegex.exec(content)) !== null) {
    const src = match[1];
    assert.ok(
      !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('//'),
      `HTML file ${file} contains external script: ${src}`
    );
  }

  // Check external links (stylesheets, fonts)
  const linkRegex = /<link\b[^>]*\bhref=["']([^"']+)["']/gi;
  while ((match = linkRegex.exec(content)) !== null) {
    const href = match[1];
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
      // Allow canonical/alternate URLs only if rel isn't stylesheet or script
      assert.ok(
        !match[0].includes('stylesheet') && !match[0].includes('preload') && !match[0].includes('dns-prefetch'),
        `HTML file ${file} contains external stylesheet/asset: ${href}`
      );
    }
  }
}
console.log(`✓ 0 external CDN scripts or remote stylesheets across ${htmlFiles.length} HTML files`);

// Test 3: Zero telemetry / tracker signatures in source code
const bannedTelemetry = [
  'google-analytics.com',
  'googletagmanager.com',
  'segment.com',
  'hotjar.com',
  'mixpanel.com',
  'sentry.io',
  'navigator.sendBeacon'
];

function scanDirForTelemetry(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== '.git' && entry.name !== 'node_modules') {
      scanDirForTelemetry(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.html'))) {
      const code = fs.readFileSync(fullPath, 'utf8');
      for (const tracker of bannedTelemetry) {
        assert.ok(
          !code.includes(tracker),
          `Privacy violation: found telemetry signature "${tracker}" in ${entry.name}`
        );
      }
    }
  }
}
scanDirForTelemetry(ROOT_DIR);
console.log('✓ Zero telemetry, analytics, or tracking signatures verified');

// Test 4: Progressive Web App Manifest validity
const manifestPath = path.join(ROOT_DIR, 'manifest.webmanifest');
assert.ok(fs.existsSync(manifestPath), 'manifest.webmanifest must exist');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

assert.ok(typeof manifest.name === 'string' && manifest.name.length > 0, 'Manifest must have a name');
assert.ok(typeof manifest.short_name === 'string' && manifest.short_name.length > 0, 'Manifest must have a short_name');
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0, 'Manifest must declare icons');
assert.ok(['standalone', 'fullscreen'].includes(manifest.display), 'Manifest display mode must be standalone or fullscreen');

for (const icon of manifest.icons) {
  const iconPath = path.join(ROOT_DIR, icon.src.replace(/^\.\//, ''));
  assert.ok(fs.existsSync(iconPath), `Manifest icon file does not exist on disk: ${icon.src}`);
}
console.log('✓ PWA manifest validity and icon asset integrity verified');

// Test 5: Service Worker Precache integrity (all listed files must physically exist)
const swPath = path.join(ROOT_DIR, 'sw.js');
assert.ok(fs.existsSync(swPath), 'sw.js must exist');
const swContent = fs.readFileSync(swPath, 'utf8');

const precacheMatch = swContent.match(/const\s+PRECACHE_ASSETS\s*=\s*\[([\s\S]*?)\];/);
assert.ok(precacheMatch, 'sw.js must declare PRECACHE_ASSETS array');

const precacheList = precacheMatch[1]
  .split('\n')
  .map((line) => line.trim().replace(/^['"]|['"],?$/g, ''))
  .filter((line) => line.length > 0 && !line.startsWith('//'));

assert.ok(precacheList.length > 5, 'PRECACHE_ASSETS must contain app shell assets');

for (const asset of precacheList) {
  if (asset === './' || asset === '/') continue;
  const filePath = path.join(ROOT_DIR, asset.replace(/^\.\//, ''));
  assert.ok(fs.existsSync(filePath), `Precache asset in sw.js does not exist on disk: ${asset}`);
}
console.log(`✓ 100% of Service Worker precache assets exist on disk (${precacheList.length} files)`);

console.log('🎉 All compliance and privacy contract tests passed successfully!');
