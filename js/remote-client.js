/**
 * Client Controller for the Mobile & Presenter Remote Control (`remote.html`).
 * Communicates via BroadcastChannel and LocalStorage fallback.
 */

import { REMOTE_CHANNEL_NAME, REMOTE_STORAGE_KEY, WEBSOCKET_RELAY_BASE } from './remote.js';
import { getPaceDescription } from './scroller.js';
import { APP_VERSION } from './version.js';

export class RemoteClientController {
  constructor() {
    this._sessionId = null;
    this._ws = null;
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

    // Extract session ID from URL query param (?session=tp_...)
    if (typeof window !== 'undefined' && window.location) {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        this._sessionId = urlParams.get('session');
        if (this._sessionId) {
          sessionStorage.setItem('teleprompter_remote_session', this._sessionId);
        } else {
          this._sessionId = sessionStorage.getItem('teleprompter_remote_session');
        }
      } catch {}
    }

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

    // Initialize WebSocket relay connection if session ID exists
    if (this._sessionId) {
      this._connectWebSocket();
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

  _connectWebSocket() {
    if (typeof WebSocket === 'undefined' || !this._sessionId) return;
    if (this._ws) {
      try {
        this._ws.onclose = null;
        this._ws.onerror = null;
        this._ws.close();
      } catch {}
      this._ws = null;
    }

    const relayBase = (typeof localStorage !== 'undefined' && localStorage.getItem('teleprompter_custom_ws_relay')) || WEBSOCKET_RELAY_BASE;
    const wsUrl = `${relayBase}${this._sessionId}`;

    try {
      const ws = new WebSocket(wsUrl);
      this._ws = ws;

      ws.onopen = () => {
        console.log('[RemoteClient] WebSocket relay connected to session:', this._sessionId);
        this._isConnected = true;
        this._render();
        this.requestState();
      };

      ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          if (raw.type === 'join' || raw.type === 'leave') return;

          const payload = raw.message || raw;
          if (payload && typeof payload === 'object') {
            this._handleMessage(payload);
          }
        } catch (err) {
          console.warn('[RemoteClient] WebSocket message parse error:', err);
        }
      };

      ws.onclose = () => {
        this._isConnected = false;
        this._render();
        if (this._ws === ws) {
          setTimeout(() => {
            if (this._ws === ws) {
              this._connectWebSocket();
            }
          }, 2000);
        }
      };

      ws.onerror = (err) => {
        console.warn('[RemoteClient] WebSocket error:', err);
      };
    } catch (err) {
      console.warn('[RemoteClient] WebSocket init error:', err);
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
    if (this._sessionId) {
      message.sessionId = this._sessionId;
    }

    let sent = false;

    // 1. Send via WebSocket relay if connected (smartphone or network)
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      try {
        this._ws.send(JSON.stringify(message));
        sent = true;
      } catch {}
    }

    // 2. Send via BroadcastChannel if available (same-computer presenter popup)
    if (this._channel) {
      try {
        this._channel.postMessage(message);
        sent = true;
      } catch {}
    }

    // 3. Fallback to LocalStorage only if neither transport succeeded
    if (!sent) {
      try {
        localStorage.setItem(
          REMOTE_STORAGE_KEY,
          JSON.stringify({ sender: 'client', payload: message, ts: Date.now() })
        );
      } catch {}
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
