/**
 * DOM Contract Test Suite:
 * Scans all JavaScript files for `document.getElementById('...')` calls
 * and asserts that every queried element ID exists in `index.html`.
 * This prevents accidental ID typos, deletions, or DOM desynchronization regressions.
 *
 * Run with Node.js: node tests/dom-contract.test.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = path.resolve(import.meta.dirname, '..');

console.log('🧪 Starting DOM Contract tests (JS queries vs index.html elements)...');

// 1. Parse all IDs from index.html
const htmlPath = path.join(ROOT_DIR, 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const idRegex = /\bid=["']([^"']+)["']/g;
const htmlIds = new Set();
let match;
while ((match = idRegex.exec(htmlContent)) !== null) {
  htmlIds.add(match[1]);
}

assert.ok(htmlIds.size > 10, `Found ${htmlIds.size} element IDs in index.html`);
console.log(`✓ Parsed ${htmlIds.size} unique element IDs from index.html`);

// 2. Scan all JS files in js/ for document.getElementById
const jsDir = path.join(ROOT_DIR, 'js');
const jsIdsQueried = new Map(); // id -> [file1, file2]

function scanJsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanJsFiles(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      const code = fs.readFileSync(fullPath, 'utf8');
      const getElemRegex = /document\.getElementById\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
      let m;
      while ((m = getElemRegex.exec(code)) !== null) {
        const id = m[1];
        if (!jsIdsQueried.has(id)) {
          jsIdsQueried.set(id, []);
        }
        jsIdsQueried.get(id).push(path.relative(ROOT_DIR, fullPath));
      }
    }
  }
}

scanJsFiles(jsDir);
assert.ok(jsIdsQueried.size > 10, `Found ${jsIdsQueried.size} queried IDs in JS`);

// 3. Assert that every queried ID exists in HTML
const missingIds = [];
for (const [id, files] of jsIdsQueried.entries()) {
  if (!htmlIds.has(id)) {
    missingIds.push({ id, files });
  }
}

assert.equal(
  missingIds.length,
  0,
  `DOM Contract Violation: The following IDs are queried in JavaScript but missing from index.html:\n` +
    missingIds.map((m) => `  - "${m.id}" in [${m.files.join(', ')}]`).join('\n')
);

console.log(`✓ Verified all ${jsIdsQueried.size} JavaScript DOM queries match elements in index.html`);
console.log('🎉 DOM Contract test passed with 100% integrity!');
