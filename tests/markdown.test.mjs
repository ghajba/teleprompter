/**
 * Test suite for Markdown parser module.
 * Run with Node.js: node tests/markdown.test.mjs
 */

import assert from 'node:assert/strict';
import { escapeHtml, stripMarkdown, renderMarkdown } from '../js/markdown.js';

console.log('🧪 Starting tests for Markdown parser...');

// Test 1: HTML Escaping / XSS Prevention
const unsafeInput = '<script>alert("xss")</script> & <img src=x onerror="hack">';
const escaped = escapeHtml(unsafeInput);
assert.equal(escaped.includes('<script>'), false, 'Should escape <script> tag');
assert.equal(escaped.includes('&lt;script&gt;'), true, 'Should convert to &lt;script&gt;');
assert.equal(escaped.includes('&amp;'), true, 'Should escape ampersand');
console.log('✓ XSS prevention and HTML escaping passed');

// Test 2: Headings Rendering
const headingsMd = '# Main Title\n## Section Subtitle\n### Small Header';
const renderedHeadings = renderMarkdown(headingsMd);
assert.equal(renderedHeadings.includes('<h1 class="prompter-heading prompter-h1">Main Title</h1>'), true);
assert.equal(renderedHeadings.includes('<h2 class="prompter-heading prompter-h2">Section Subtitle</h2>'), true);
assert.equal(renderedHeadings.includes('<h3 class="prompter-heading prompter-h3">Small Header</h3>'), true);
console.log('✓ Heading levels parsed correctly');

// Test 3: Inline Formats (Bold, Italic, Strikethrough)
const inlineMd = 'This is **bold speech** and *italic tone* and ~~deleted~~.';
const renderedInline = renderMarkdown(inlineMd);
assert.equal(renderedInline.includes('<strong class="prompter-bold">bold speech</strong>'), true);
assert.equal(renderedInline.includes('<em class="prompter-italic">italic tone</em>'), true);
assert.equal(renderedInline.includes('<del class="prompter-del">deleted</del>'), true);
console.log('✓ Inline formatting (bold, italic, strikethrough) passed');

// Test 4: Stage Directions / Cues
const cueMd = 'Welcome audience. [Pause for 2 seconds and look at camera 2] Now begin.';
const renderedCue = renderMarkdown(cueMd);
assert.equal(renderedCue.includes('<span class="prompter-cue" title="Stage direction &ndash; do not speak">🎬 Pause for 2 seconds and look at camera 2</span>'), true);
console.log('✓ Stage direction cues parsed and styled correctly');

// Test 5: Horizontal Rule / Pause Bar
const hrMd = 'Section 1\n\n---\n\nSection 2';
const renderedHr = renderMarkdown(hrMd);
assert.equal(renderedHr.includes('<div class="prompter-pause-bar" title="Pause / Break"><span>⏸ PAUSE / BREAK</span></div>'), true);
console.log('✓ Pause / Break bar (---) parsed correctly');

// Test 6: Lists
const listMd = '- First item\n- Second item\n* Third item';
const renderedList = renderMarkdown(listMd);
assert.equal(renderedList.includes('<ul class="prompter-list">'), true);
assert.equal(renderedList.includes('<li>First item</li>'), true);
assert.equal(renderedList.includes('<li>Second item</li>'), true);
assert.equal(renderedList.includes('<li>Third item</li>'), true);
assert.equal(renderedList.includes('</ul>'), true);
console.log('✓ Unordered list parsed correctly');

// Test 7: stripMarkdown for accurate word counts
const dirtyMd = '# Welcome\n\nThis is a **crucial** test with [Pause 3s] and *emphasis*.\n- Point 1\n- Point 2\n---';
const stripped = stripMarkdown(dirtyMd);
// Stage directions [Pause 3s] must be excluded from spoken word count!
assert.equal(stripped.includes('Pause 3s'), false, 'Stage direction should not be counted as spoken words');
assert.equal(stripped.includes('#'), false, 'Heading hashes should be stripped');
assert.equal(stripped.includes('**'), false, 'Bold asterisks should be stripped');
const words = stripped.split(/\s+/).filter(Boolean);
assert.equal(words.length, 13, 'Should accurately count spoken words only');
console.log('✓ stripMarkdown word count sanitization passed');

console.log('🎉 All Markdown parser tests passed successfully!');
