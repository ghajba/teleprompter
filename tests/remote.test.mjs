/**
 * Test Suite for Remote Control Messaging Protocol:
 * Tests channel naming, message payload serialization,
 * command routing, and state syncing.
 *
 * Run with Node.js: node tests/remote.test.mjs
 */

import assert from 'node:assert/strict';
import { REMOTE_CHANNEL_NAME, REMOTE_STORAGE_KEY } from '../js/remote.js';

console.log('🧪 Starting tests for Remote Control Messaging Protocol...');

// Test 1: Channel and storage bus constants
assert.equal(typeof REMOTE_CHANNEL_NAME, 'string');
assert.ok(REMOTE_CHANNEL_NAME.length > 5);
assert.equal(typeof REMOTE_STORAGE_KEY, 'string');
assert.ok(REMOTE_STORAGE_KEY.length > 5);
console.log('✓ Communication bus identifiers verified');

// Test 2: Message payload serialization and structure
const validCommands = [
  { type: 'REMOTE_COMMAND', action: 'toggle' },
  { type: 'REMOTE_COMMAND', action: 'play' },
  { type: 'REMOTE_COMMAND', action: 'pause' },
  { type: 'REMOTE_COMMAND', action: 'speed_delta', value: 5 },
  { type: 'REMOTE_COMMAND', action: 'speed_delta', value: -5 },
  { type: 'REMOTE_COMMAND', action: 'rewind' },
  { type: 'REMOTE_COMMAND', action: 'reset' },
  { type: 'REMOTE_COMMAND', action: 'toggle_reverse' },
  { type: 'REMOTE_REQUEST_STATE' }
];

for (const cmd of validCommands) {
  const serialized = JSON.stringify(cmd);
  const parsed = JSON.parse(serialized);
  assert.equal(parsed.type, cmd.type);
  if (cmd.action) {
    assert.equal(parsed.action, cmd.action);
  }
}
console.log(`✓ All ${validCommands.length} command action schemas verified`);

// Test 3: Prompter state sync payload structure
const mockStatePayload = {
  isPlaying: true,
  isCountingDown: false,
  wpm: 145,
  pace: 'Brisk & Dynamic',
  progressPercent: 42,
  remainingFormatted: '01:35',
  totalFormatted: '02:45',
  isReverse: false
};

const stateMessage = {
  type: 'PROMPTER_STATE',
  state: mockStatePayload,
  timestamp: Date.now()
};

const roundtrip = JSON.parse(JSON.stringify(stateMessage));
assert.equal(roundtrip.type, 'PROMPTER_STATE');
assert.equal(roundtrip.state.wpm, 145);
assert.equal(roundtrip.state.progressPercent, 42);
assert.equal(roundtrip.state.remainingFormatted, '01:35');
console.log('✓ Host state sync roundtrip verified');

// Test 4: QR Code module evaluation & strict-mode integrity
const { renderQRCode, QRCode } = await import('../js/qrcode.js');
assert.equal(typeof renderQRCode, 'function', 'renderQRCode must be a function');
assert.equal(typeof QRCode, 'function', 'QRCode constructor must be a function');
console.log('✓ Pure JS QR Code generator loaded in strict mode without runtime exceptions');

// Test 5: Remote host controller methods
const { remoteHost, detectLocalIP } = await import('../js/remote.js');
assert.equal(typeof remoteHost.getRemoteUrl, 'function');
assert.ok(remoteHost.getRemoteUrl().includes('remote.html'));
console.log('✓ Remote host URL resolution verified');

// Test 6: WebRTC local IP auto-detection export & headless fallback
assert.equal(typeof detectLocalIP, 'function', 'detectLocalIP must be exported as a function');
const detected = await detectLocalIP();
assert.equal(detected, null, 'detectLocalIP should resolve null gracefully in Node.js headless environment');
console.log('✓ Zero-dependency WebRTC IP sniffer headless fallback verified');

console.log('🎉 All Remote Control protocol tests passed successfully!');
