/**
 * Client Controller for the Mobile & Presenter Remote Control (`remote.html`).
 * Communicates via BroadcastChannel and LocalStorage fallback.
 */

import { REMOTE_CHANNEL_NAME, REMOTE_STORAGE_KEY } from './remote.js';
import { getPaceDescription } from './scroller.js';
import { APP_VERSION } from './version.js';

export class RemoteClientController {
  constructor() {
    this._channel = null;
    this._isConnected = false;
    this._state = {
      isPlaying: false,
      isCountingDown: false,
      wpm: 130,
      pace: 'Conversational',
      progressPercent: 0,
      remainingFormatted: '00:00',
      totalFormatted: '00:00',
      isReverse: false
    };

    // UI Elements
    this._statusDot = document.getElementById('remoteStatusDot');
    this._statusText = document.getElementById('remoteStatusText');
    this._btnToggle = document.getElementById('btnRemoteToggle');
    this._toggleIcon = document.getElementById('btnRemoteToggleIcon');
    this._toggleLabel = document.getElementById('btnRemoteToggleLabel');
    this._speedMinus = document.getElementById('btnRemoteSpeedMinus');
    this._speedPlus = document.getElementById('btnRemoteSpeedPlus');
    this._speedValue = document.getElementById('remoteSpeedValue');
    this._paceValue = document.getElementById('remotePaceValue');
    this._progressFill = document.getElementById('remoteProgressFill');
    this._progressPercent = document.getElementById('remoteProgressPercent');
    this._timeRemaining = document.getElementById('remoteTimeRemaining');
    this._timeTotal = document.getElementById('remoteTimeTotal');
    this._btnRewind = document.getElementById('btnRemoteRewind');
    this._btnForward = document.getElementById('btnRemoteForward');
    this._btnReset = document.getElementById('btnRemoteReset');
    this._btnReverse = document.getElementById('btnRemoteReverse');
    this._seenMsgIds = new Set();
  }

  init() {
    // Stamp version
    document.querySelectorAll('.app-version-text').forEach((el) => {
      el.textContent = APP_VERSION;
    });

    // Initialize BroadcastChannel
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this._channel = new BroadcastChannel(REMOTE_CHANNEL_NAME);
        this._channel.onmessage = (event) => this._handleMessage(event.data);
      } catch (err) {
        console.warn('[RemoteClient] BroadcastChannel unavailable:', err);
      }
    }

    // Initialize LocalStorage fallback
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === REMOTE_STORAGE_KEY && event.newValue) {
          try {
            const data = JSON.parse(event.newValue);
            if (data && data.sender === 'host') {
              this._handleMessage(data.payload);
            }
          } catch {
            // Ignore malformed storage events
          }
        }
      });
    }

    this._bindEvents();
    this.requestState();

    // Periodic state ping if not connected
    setInterval(() => {
      if (!this._isConnected) {
        this.requestState();
      }
    }, 1500);
  }

  _bindEvents() {
    const triggerHaptic = () => {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(18);
        } catch {
          // Ignore vibration failures
        }
      }
    };

    if (this._btnToggle) {
      this._btnToggle.addEventListener('click', () => {
        triggerHaptic();
        this.sendCommand('toggle');
      });
    }

    if (this._speedMinus) {
      this._speedMinus.addEventListener('click', () => {
        triggerHaptic();
        this.sendCommand('speed_delta', -5);
      });
    }

    if (this._speedPlus) {
      this._speedPlus.addEventListener('click', () => {
        triggerHaptic();
        this.sendCommand('speed_delta', 5);
      });
    }

    if (this._btnRewind) {
      this._btnRewind.addEventListener('click', () => {
        triggerHaptic();
        this.sendCommand('rewind');
      });
    }

    if (this._btnForward) {
      this._btnForward.addEventListener('click', () => {
        triggerHaptic();
        this.sendCommand('forward');
      });
    }

    if (this._btnReset) {
      this._btnReset.addEventListener('click', () => {
        triggerHaptic();
        this.sendCommand('reset');
      });
    }

    if (this._btnReverse) {
      this._btnReverse.addEventListener('click', () => {
        triggerHaptic();
        this.sendCommand('toggle_reverse');
      });
    }
  }

  /**
   * Requests immediate state sync from teleprompter host.
   */
  requestState() {
    this._postMessage({ type: 'REMOTE_REQUEST_STATE' });
  }

  /**
   * Dispatches a remote command to host.
   * @param {string} action
   * @param {any} [value]
   */
  sendCommand(action, value) {
    this._postMessage({
      type: 'REMOTE_COMMAND',
      action,
      value
    });
  }

  _postMessage(message) {
    message.id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    message.timestamp = Date.now();

    // Prefer BroadcastChannel when available, avoiding duplicate LocalStorage events
    if (this._channel) {
      try {
        this._channel.postMessage(message);
        return;
      } catch {
        // Channel error, fall back to LocalStorage below
      }
    }

    try {
      localStorage.setItem(
        REMOTE_STORAGE_KEY,
        JSON.stringify({ sender: 'client', payload: message, ts: Date.now() })
      );
    } catch {
      // LocalStorage error
    }
  }

  _handleMessage(message) {
    if (!message || typeof message !== 'object') return;

    if (message.id) {
      if (this._seenMsgIds.has(message.id)) return;
      this._seenMsgIds.add(message.id);
      if (this._seenMsgIds.size > 50) {
        const [oldest] = this._seenMsgIds;
        this._seenMsgIds.delete(oldest);
      }
    }

    if (message.type === 'PROMPTER_STATE' && message.state) {
      this._isConnected = true;
      this._state = { ...this._state, ...message.state };
      this._render();
    }
  }

  _render() {
    const { isPlaying, isCountingDown, wpm, progressPercent, remainingFormatted, totalFormatted, isReverse } = this._state;

    // Status Dot & Text
    if (this._statusDot) {
      this._statusDot.classList.toggle('playing', isPlaying);
      this._statusDot.classList.toggle('connected', this._isConnected);
    }

    if (this._statusText) {
      if (!this._isConnected) {
        this._statusText.textContent = 'Connecting...';
      } else if (isCountingDown) {
        this._statusText.textContent = 'Countdown Active';
      } else if (isPlaying) {
        this._statusText.textContent = isReverse ? 'Rewinding' : 'Scrolling';
      } else {
        this._statusText.textContent = 'Paused';
      }
    }

    // Toggle Button
    if (this._btnToggle) {
      this._btnToggle.classList.toggle('is-playing', isPlaying);
    }
    if (this._toggleIcon) {
      this._toggleIcon.textContent = isCountingDown ? '⏹' : isPlaying ? '⏸' : '▶';
    }
    if (this._toggleLabel) {
      this._toggleLabel.textContent = isCountingDown ? 'Cancel' : isPlaying ? 'Pause' : 'Play';
    }

    // Speed & Pace
    if (this._speedValue) {
      this._speedValue.textContent = `${wpm} WPM`;
    }
    if (this._paceValue) {
      this._paceValue.textContent = getPaceDescription(wpm);
    }

    // Progress Bar & Timer
    const clampedProgress = Math.max(0, Math.min(100, Math.round(progressPercent)));
    if (this._progressFill) {
      this._progressFill.style.width = `${clampedProgress}%`;
    }
    if (this._progressPercent) {
      this._progressPercent.textContent = `${clampedProgress}%`;
    }
    if (this._timeRemaining) {
      this._timeRemaining.textContent = remainingFormatted;
    }
    if (this._timeTotal) {
      this._timeTotal.textContent = totalFormatted;
    }

    // Reverse state indication
    if (this._btnReverse) {
      this._btnReverse.classList.toggle('is-active', isReverse);
    }
  }
}

// Auto-bootstrap client on DOMContentLoaded
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const client = new RemoteClientController();
    client.init();
  });
}
