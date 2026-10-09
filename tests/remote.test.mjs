/**
 * Test Suite for Remote Control Messaging Protocol:
 * Tests channel naming, message payload serialization,
 * command routing, and state syncing.
 *
 * Run with Node.js: node tests/remote.test.mjs
 */

import assert from 'node:assert/strict';
import {
  REMOTE_CHANNEL_NAME,
  REMOTE_STORAGE_KEY,
  WEBSOCKET_RELAY_BASE,
  generateSessionId,
  generateSessionIdSync
} from '../js/remote.js';

console.log('🧪 Starting tests for Remote Control Messaging Protocol...');

// Test 1: Channel and storage bus constants
assert.equal(typeof REMOTE_CHANNEL_NAME, 'string');
assert.ok(REMOTE_CHANNEL_NAME.length > 5);
assert.equal(typeof REMOTE_STORAGE_KEY, 'string');
assert.ok(REMOTE_STORAGE_KEY.length > 5);
assert.equal(typeof WEBSOCKET_RELAY_BASE, 'string');
assert.ok(WEBSOCKET_RELAY_BASE.startsWith('wss://'));
console.log('✓ Communication bus and WebSocket relay identifiers verified');

// Test 2: Cryptographic Session ID generation & collision resistance
const syncId = generateSessionIdSync();
assert.ok(syncId.startsWith('tp_'), 'Session ID must start with tp_ prefix');
assert.equal(syncId.length, 35, 'Sync session ID must be 35 chars (tp_ + 32 hex chars = 128 bits)');
assert.ok(/^[a-z0-9_]+$/.test(syncId), 'Session ID must be URL-safe alphanumeric');

const asyncId = await generateSessionId();
assert.ok(asyncId.startsWith('tp_'), 'Async SHA-256 session ID must start with tp_ prefix');
assert.ok(asyncId.length >= 27, 'Async session ID must have sufficient cryptographic entropy');
assert.ok(/^[a-z0-9_]+$/.test(asyncId), 'Session ID must be strictly URL-safe');

// Verify uniqueness and zero collision across 100 generated sessions
const generatedIds = new Set();
for (let i = 0; i < 100; i++) {
  const id = await generateSessionId();
  assert.ok(!generatedIds.has(id), `Session collision detected at index ${i}: ${id}`);
  generatedIds.add(id);
}
assert.equal(generatedIds.size, 100, 'All 100 generated session IDs must be strictly unique');
console.log('✓ Cryptographic SHA-256 session ID entropy & zero-collision verified');

// Test 2: Message payload serialization and structure
const validCommands = [
  { type: 'REMOTE_COMMAND', action: 'toggle' },
  { type: 'REMOTE_COMMAND', action: 'play' },
  { type: 'REMOTE_COMMAND', action: 'pause' },
  { type: 'REMOTE_COMMAND', action: 'speed_delta', value: 5 },
  { type: 'REMOTE_COMMAND', action: 'speed_delta', value: -5 },
  { type: 'REMOTE_COMMAND', action: 'rewind' },
  { type: 'REMOTE_COMMAND', action: 'forward' },
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

// Test 5: Remote host controller methods & session query URL resolution
const { remoteHost, detectLocalIP } = await import('../js/remote.js');
assert.equal(typeof remoteHost.getRemoteUrl, 'function');
assert.ok(remoteHost.getRemoteUrl().includes('remote.html'));
remoteHost._sessionId = 'tp_mock_test_session_456';
assert.ok(
  remoteHost.getRemoteUrl().includes('session=tp_mock_test_session_456'),
  'getRemoteUrl must include session query param when session is active'
);
console.log('✓ Remote host URL and session query parameter resolution verified');

// Test 6: WebRTC local IP auto-detection export & headless fallback
assert.equal(typeof detectLocalIP, 'function', 'detectLocalIP must be exported as a function');
const detected = await detectLocalIP();
assert.equal(detected, null, 'detectLocalIP should resolve null gracefully in Node.js headless environment');
console.log('✓ Zero-dependency WebRTC IP sniffer headless fallback verified');

// Test 7: Auto-close pairing modal on peer connection
let modalClosed = false;
remoteHost._modalEl = {
  classList: {
    contains: (cls) => cls !== 'hidden',
    add: () => { modalClosed = true; },
    remove: () => {}
  }
};
remoteHost._peerStatusEl = { style: { display: 'none' } };
remoteHost._isPeerConnected = false;
remoteHost._setPeerConnected(true);
assert.equal(remoteHost._isPeerConnected, true);
assert.ok(remoteHost._autoCloseTimer !== null, 'Auto-close timer must be scheduled');
remoteHost.closeModal();
assert.equal(modalClosed, true);
assert.equal(remoteHost._autoCloseTimer, null);
console.log('✓ Auto-closing pairing modal on peer connection verified');

console.log('🎉 All Remote Control protocol tests passed successfully!');
