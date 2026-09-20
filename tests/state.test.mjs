/**
 * Test suite for StateStore and Storage modules.
 * Run with Node.js: node tests/state.test.mjs
 */

import assert from 'node:assert/strict';

// Mock browser window and localStorage for Node environment
class MockLocalStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
  get length() {
    return this.store.size;
  }
  key(index) {
    return Array.from(this.store.keys())[index] || null;
  }
}

globalThis.window = {
  localStorage: new MockLocalStorage()
};

// Import modules to test
const { store, DEFAULT_STATE } = await import('../js/state.js');
const { isStorageAvailable, saveItem, loadItem } = await import('../js/storage.js');

console.log('🧪 Starting tests for StateStore and Storage...');

// Test 1: Storage availability
assert.equal(isStorageAvailable(), true, 'Storage should be available in mock');
saveItem('test_key', { foo: 'bar' });
assert.deepEqual(loadItem('test_key', {}), { foo: 'bar' }, 'Should roundtrip JSON data');
console.log('✓ Storage helper operations passed');

// Test 2: Initial state
const initialState = store.getState();
assert.equal(initialState.speed, DEFAULT_STATE.speed);
assert.equal(initialState.isPlaying, false);
assert.equal(typeof initialState.text, 'string');
console.log('✓ Initial state validation passed');

// Test 3: State update & Subscription notification
let notified = false;
let observedChangedKeys = [];
const unsubscribe = store.subscribe((current, changedKeys, prev) => {
  notified = true;
  observedChangedKeys = changedKeys;
  assert.equal(prev.speed, DEFAULT_STATE.speed);
  assert.equal(current.speed, 65);
});

store.setState({ speed: 65 });
assert.equal(notified, true, 'Subscriber should have been notified');
assert.deepEqual(observedChangedKeys, ['speed'], 'Changed keys should contain "speed"');
assert.equal(store.getState().speed, 65, 'Speed should be updated in store');
unsubscribe();

// Test 4: Unsubscribed listeners should not receive notifications
notified = false;
store.setState({ speed: 70 });
assert.equal(notified, false, 'Unsubscribed listener must not be called');
console.log('✓ Subscriptions and notifications passed');

// Test 5: resetToDefaults
store.setState({ fontSize: 90, text: 'Custom Speech Script' });
assert.equal(store.getState().fontSize, 90);
store.resetToDefaults(true); // keepText = true
assert.equal(store.getState().fontSize, DEFAULT_STATE.fontSize, 'Font size should reset');
assert.equal(store.getState().text, 'Custom Speech Script', 'Script text should be preserved');
console.log('✓ Reset to defaults passed');

console.log('🎉 All tests passed successfully!');
