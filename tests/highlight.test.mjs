/**
 * Test Suite for Reading Highlight Controller:
 * Tests focus modes ('none', 'dim', 'accent'), CSS class toggles,
 * and element focus assignment.
 *
 * Run with Node.js: node tests/highlight.test.mjs
 */

import assert from 'node:assert/strict';
import { ReadingHighlightController } from '../js/highlight.js';
import { store } from '../js/state.js';

console.log('🧪 Starting tests for ReadingHighlightController...');

// Mock DOM elements
function createMockElement(className = '') {
  const classes = new Set(className.split(' ').filter(Boolean));
  return {
    classList: {
      add: (...cls) => cls.forEach((c) => classes.add(c)),
      remove: (...cls) => cls.forEach((c) => classes.delete(c)),
      contains: (c) => classes.has(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (classes.has(c)) classes.delete(c);
          else classes.add(c);
        } else if (force) {
          classes.add(c);
        } else {
          classes.delete(c);
        }
      }
    }
  };
}

const mockContainer = createMockElement();
const mockTextInner = {
  children: []
};

const controller = new ReadingHighlightController();
controller.init({
  containerEl: mockContainer,
  textInnerEl: mockTextInner
});

// Test 1: Default mode application
controller.applyMode('none');
assert.ok(mockContainer.classList.contains('highlight-mode-none'));
assert.ok(!mockContainer.classList.contains('highlight-mode-dim'));
assert.ok(!mockContainer.classList.contains('highlight-mode-accent'));
console.log('✓ Mode "none" correctly applies CSS class');

// Test 2: Mode switching to 'dim'
controller.applyMode('dim');
assert.ok(mockContainer.classList.contains('highlight-mode-dim'));
assert.ok(!mockContainer.classList.contains('highlight-mode-none'));
console.log('✓ Mode "dim" correctly applies CSS class');

// Test 3: Mode switching to 'accent'
controller.applyMode('accent');
assert.ok(mockContainer.classList.contains('highlight-mode-accent'));
assert.ok(!mockContainer.classList.contains('highlight-mode-dim'));
console.log('✓ Mode "accent" correctly applies CSS class');

// Test 4: Direct element focus
const p1 = createMockElement('prompter-paragraph');
const p2 = createMockElement('prompter-paragraph');

controller.focusElement(p1);
assert.ok(p1.classList.contains('is-focused'));

controller.focusElement(p2);
assert.ok(!p1.classList.contains('is-focused'), 'Previous element should lose focus');
assert.ok(p2.classList.contains('is-focused'), 'New element should gain focus');
console.log('✓ Single active focus tracking verified');

console.log('🎉 All ReadingHighlightController tests passed successfully!');
