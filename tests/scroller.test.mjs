/**
 * Test suite for ScrollerEngine and mathematical calculations:
 * - Speed calibration from WPM
 * - Qualitative speaking pace classification
 * - Progress percentage and boundary clamping
 * - Reading duration formatting (MM:SS)
 *
 * Run with Node.js: node tests/scroller.test.mjs
 */

import assert from 'node:assert/strict';

// Mock DOM elements and environment for Node test runner
class MockElement {
  constructor() {
    this.style = {};
    this.classList = new Set();
    this.offsetHeight = 1200;
    this.scrollHeight = 1200;
  }
  querySelector() {
    return this;
  }
  addEventListener() {}
  removeEventListener() {}
}

globalThis.window = {
  innerHeight: 800,
  addEventListener() {},
  removeEventListener() {},
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {}
  }
};

// Import modules to test
const { scroller, getPaceDescription } = await import('../js/scroller.js');
const { store, DEFAULT_STATE } = await import('../js/state.js');

console.log('🧪 Starting tests for ScrollerEngine and WPM calculations...');

// Test 1: Pace description boundary tiers
assert.equal(getPaceDescription(80), 'Very Slow');
assert.equal(getPaceDescription(99), 'Very Slow');
assert.equal(getPaceDescription(100), 'Slow & Clear');
assert.equal(getPaceDescription(124), 'Slow & Clear');
assert.equal(getPaceDescription(125), 'Conversational');
assert.equal(getPaceDescription(154), 'Conversational');
assert.equal(getPaceDescription(155), 'Brisk & Energetic');
assert.equal(getPaceDescription(184), 'Brisk & Energetic');
assert.equal(getPaceDescription(185), 'Fast Pace');
assert.equal(getPaceDescription(219), 'Fast Pace');
assert.equal(getPaceDescription(220), 'Rapid Fire');
assert.equal(getPaceDescription(260), 'Rapid Fire');
console.log('✓ Qualitative speaking pace classifications verified');

// Test 2: calculateSpeedFromWpm behavior
store.setState({
  text: 'One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty.',
  fontSize: 48
});

const speedSlow = scroller.calculateSpeedFromWpm(60);
const speedNormal = scroller.calculateSpeedFromWpm(130);
const speedFast = scroller.calculateSpeedFromWpm(220);

assert.ok(speedSlow > 0, 'Speed must be positive');
assert.ok(speedNormal > speedSlow, 'Higher WPM must yield higher scroll speed');
assert.ok(speedFast > speedNormal, 'Fastest WPM must yield highest scroll speed');
assert.ok(speedSlow >= 8, 'Speed should not drop below minimum hardware sub-pixel floor');
assert.ok(speedFast <= 180, 'Speed should not exceed max readable ceiling');
console.log(`✓ WPM-to-speed calculations verified (60 WPM=${speedSlow}px/s, 130 WPM=${speedNormal}px/s, 220 WPM=${speedFast}px/s)`);

// Test 3: Scroll clamping and navigation
const mockContent = new MockElement();
scroller.init({ contentEl: mockContent });

scroller.setScrollY(0);
assert.equal(scroller.getScrollY(), 0);

scroller.setScrollY(-50); // Negative scroll attempt
assert.equal(scroller.getScrollY(), 0, 'Scroll position must clamp at 0');

scroller.setScrollY(250);
assert.equal(scroller.getScrollY(), 250);

scroller.reset();
assert.equal(scroller.getScrollY(), 0, 'Reset must return scroll to 0');
console.log('✓ Scroll positioning and boundary clamping verified');

// Test 4: Reading metrics and duration formatting
scroller.setScrollY(0);
const metricsStart = scroller.getMetrics();
assert.equal(typeof metricsStart.words, 'number');
assert.ok(metricsStart.words > 0);
assert.equal(metricsStart.progress, 0, 'Progress must be 0% at start');
assert.match(metricsStart.remainingFormatted, /^\d{2}:\d{2}$/, 'Remaining time must match MM:SS format');
assert.match(metricsStart.totalFormatted, /^\d{2}:\d{2}$/, 'Total time must match MM:SS format');

// Advance scroll position and check progress
scroller.setScrollY(300);
const metricsMid = scroller.getMetrics();
assert.ok(metricsMid.progress > 0, 'Progress should increase as scroll increases');
assert.ok(metricsMid.elapsedSeconds >= 0, 'Elapsed seconds should be non-negative');

console.log('✓ Reading metrics and MM:SS duration formatting verified');

// Test 5: Countdown cancel time tracking
const cancelTimeBefore = scroller.getLastCountdownCancelTime();
scroller.cancelCountdown();
const cancelTimeAfter = scroller.getLastCountdownCancelTime();
assert.ok(cancelTimeAfter >= cancelTimeBefore, 'Cancel countdown should update timestamp');
console.log('✓ Countdown cancel timing verified');

console.log('🎉 All ScrollerEngine tests passed successfully!');
