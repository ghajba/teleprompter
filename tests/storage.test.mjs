/**
 * Test suite for Storage module resilience and edge cases:
 * - JSON serialization / deserialization roundtrip
 * - Corrupted / malformed JSON recovery
 * - Missing key fallback handling
 * - Storage exceptions resilience (QuotaExceededError, SecurityError)
 * - Debounce helper execution
 *
 * Run with Node.js: node tests/storage.test.mjs
 */

import assert from 'node:assert/strict';

class MockFailingStorage {
  constructor() {
    this.store = new Map();
    this.shouldThrow = false;
  }
  getItem(key) {
    if (this.shouldThrow) throw new Error('SecurityError: Access is denied');
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, val) {
    if (this.shouldThrow) throw new Error('QuotaExceededError: DOM Exception 22');
    this.store.set(key, String(val));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

const mockStorage = new MockFailingStorage();
globalThis.window = {
  localStorage: mockStorage
};

// Import module to test
const { isStorageAvailable, saveItem, loadItem, removeItem, debounce } = await import('../js/storage.js');

console.log('🧪 Starting tests for Storage resilience and error recovery...');

// Test 1: Basic roundtrip operations
mockStorage.clear();
mockStorage.shouldThrow = false;

assert.equal(isStorageAvailable(), true, 'Storage should be reported available');
saveItem('user_pref', { theme: 'dark', count: 42 });
const loaded = loadItem('user_pref', {});
assert.deepEqual(loaded, { theme: 'dark', count: 42 }, 'Object should roundtrip accurately');
console.log('✓ Normal save and load roundtrip verified');

// Test 2: Missing key fallback
const nonExistent = loadItem('does_not_exist_key', { fallback: true });
assert.deepEqual(nonExistent, { fallback: true }, 'Missing key must return default fallback');
console.log('✓ Missing key default fallback verified');

// Test 3: Corrupted / invalid JSON recovery
mockStorage.store.set('corrupted_key', '{ bad: json; not-a-val');
const recovered = loadItem('corrupted_key', { safe: true });
assert.deepEqual(recovered, { safe: true }, 'Corrupted JSON must gracefully return fallback without throwing');
console.log('✓ Corrupted JSON graceful error recovery verified');

// Test 4: Exception handling when localStorage throws (Quota or Security error)
mockStorage.shouldThrow = true;
assert.doesNotThrow(() => {
  saveItem('failing_save', { will: 'fail' });
}, 'saveItem must not crash the app even if localStorage throws an error');

assert.doesNotThrow(() => {
  const result = loadItem('failing_load', { fallbackValue: 123 });
  assert.equal(result.fallbackValue, 123, 'loadItem must return fallback when storage throws');
}, 'loadItem must handle storage exceptions safely');
console.log('✓ Fault tolerance under storage exceptions verified');
mockStorage.shouldThrow = false;

// Test 5: removeItem verification
saveItem('item_to_remove', 'test_value');
assert.equal(loadItem('item_to_remove', null), 'test_value');
removeItem('item_to_remove');
assert.equal(loadItem('item_to_remove', null), null, 'Key must be removed');
console.log('✓ removeItem operation verified');

// Test 6: Debounce helper execution
let callCount = 0;
const debouncedFn = debounce(() => {
  callCount += 1;
}, 50);

debouncedFn();
debouncedFn();
debouncedFn();
assert.equal(callCount, 0, 'Debounced function should not execute synchronously');

await new Promise((resolve) => setTimeout(resolve, 80));
assert.equal(callCount, 1, 'Debounced function should execute exactly once after timeout window');
console.log('✓ Debounce helper rate-limiting verified');

console.log('🎉 All Storage resilience tests passed successfully!');
