/**
 * Wireless Remote Control Subsystem.
 * Provides synchronized multi-screen and smartphone pocket control
 * using BroadcastChannel and LocalStorage cross-window messaging bus.
 */

import { store } from './state.js';
import { scroller } from './scroller.js';
import { renderQRCode } from './qrcode.js';

export const REMOTE_CHANNEL_NAME = 'teleprompter_remote_channel';
export const REMOTE_STORAGE_KEY = 'teleprompter_remote_bus';

/**
 * Automatically discovers local LAN/Wi-Fi IPv4 address using WebRTC ICE candidate sniffing.
 * Zero external servers, zero dependencies.
 * @returns {Promise<string|null>}
 */
export async function detectLocalIP() {
  if (typeof window === 'undefined' || typeof RTCPeerConnection === 'undefined') {
    return null;
  }

  return new Promise((resolve) => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      let resolved = false;

      const finish = (ip) => {
        if (!resolved) {
          resolved = true;
          try {
            pc.close();
          } catch {}
          resolve(ip);
        }
      };

      // 1.2 second timeout safety net
      const timer = setTimeout(() => finish(null), 1200);

      pc.createDataChannel('detect-ip');
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch(() => finish(null));

      pc.onicecandidate = (event) => {
        if (!event || !event.candidate || !event.candidate.candidate) return;
        const cand = event.candidate.candidate;
        // Search for private IPv4: 192.168.x.x, 10.x.x.x, 172.16-31.x.x
        const match = cand.match(/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[0-1])\.\d+\.\d+)/);
        if (match && match[1]) {
          clearTimeout(timer);
          finish(match[1]);
        }
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Host Controller (Prompter side):
 * Receives remote commands and broadcasts live playback state.
 */
export class RemoteHostController {
  constructor() {
    this._channel = null;
    this._modalEl = null;
    this._qrContainerEl = null;
    this._urlInputEl = null;
    this._copyBtnEl = null;
    this._copyFeedbackEl = null;
    this._closeModalBtnEl = null;
    this._openWindowBtnEl = null;
    this._showQrBtnEl = null;
    this._launchTabBtnEl = null;
    this._hostInputEl = null;
    this._resetHostBtnEl = null;
    this._hostSectionEl = null;
    this._autoDetectBadgeEl = null;
    this._lastBroadcastState = null;
    this._seenMsgIds = new Set();
    this._lastToggleTime = 0;
  }

  /**
   * Initializes host controller with DOM elements and event channels.
   */
  init() {
    this._modalEl = document.getElementById('remoteModal');
    this._qrContainerEl = document.getElementById('remoteQrCode');
    this._urlInputEl = document.getElementById('remotePairingUrl');
    this._copyBtnEl = document.getElementById('btnCopyRemoteUrl');
    this._copyFeedbackEl = document.getElementById('remoteCopyFeedback');
    this._closeModalBtnEl = document.getElementById('btnCloseRemoteModal');
    this._openWindowBtnEl = document.getElementById('btnOpenRemoteWindow');
    this._showQrBtnEl = document.getElementById('btnShowRemoteQR');
    this._launchTabBtnEl = document.getElementById('btnLaunchRemoteTab');
    this._hostInputEl = document.getElementById('remoteHostInput');
    this._resetHostBtnEl = document.getElementById('btnResetRemoteHost');
    this._hostSectionEl = document.getElementById('remoteHostConfigSection');
    this._autoDetectBadgeEl = document.getElementById('remoteAutoDetectBadge');

    // Setup BroadcastChannel
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this._channel = new BroadcastChannel(REMOTE_CHANNEL_NAME);
        this._channel.onmessage = (event) => this._handleRemoteMessage(event.data);
      } catch (err) {
        console.warn('[RemoteHost] BroadcastChannel unavailable:', err);
      }
    }

    // Setup LocalStorage cross-tab fallback
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === REMOTE_STORAGE_KEY && event.newValue) {
          try {
            const data = JSON.parse(event.newValue);
            if (data && data.sender === 'client') {
              this._handleRemoteMessage(data.payload);
            }
          } catch {
            // Ignore malformed storage messages
          }
        }
      });
    }

    // Bind UI actions
    if (this._showQrBtnEl) {
      this._showQrBtnEl.addEventListener('click', () => this.openModal());
    }
    if (this._closeModalBtnEl) {
      this._closeModalBtnEl.addEventListener('click', () => this.closeModal());
    }
    if (this._openWindowBtnEl) {
      this._openWindowBtnEl.addEventListener('click', () => this.openPopupRemote());
    }
    if (this._launchTabBtnEl) {
      this._launchTabBtnEl.addEventListener('click', () => {
        window.open(this.getRemoteUrl(false), '_blank');
      });
    }
    if (this._copyBtnEl) {
      this._copyBtnEl.addEventListener('click', () => this.copyPairingUrl());
    }

    if (this._hostInputEl) {
      this._hostInputEl.addEventListener('input', () => {
        const custom = this._hostInputEl.value.trim();
        if (custom) {
          localStorage.setItem('teleprompter_custom_remote_host', custom);
        } else {
          localStorage.removeItem('teleprompter_custom_remote_host');
        }
        this.updatePairingView();
      });
    }

    if (this._resetHostBtnEl) {
      this._resetHostBtnEl.addEventListener('click', () => {
        localStorage.removeItem('teleprompter_custom_remote_host');
        if (this._hostInputEl) {
          this._hostInputEl.value = '';
        }
        if (this._autoDetectBadgeEl) {
          this._autoDetectBadgeEl.style.display = 'none';
        }
        this.updatePairingView();
      });
    }

    if (this._modalEl) {
      this._modalEl.addEventListener('click', (e) => {
        if (e.target === this._modalEl) {
          this.closeModal();
        }
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._modalEl && !this._modalEl.classList.contains('hidden')) {
        this.closeModal();
      }
    });

    // Broadcast state updates on every state change
    store.subscribe((state, changedKeys) => {
      const watched = ['isPlaying', 'wpm', 'reverseScroll', 'isCountingDown'];
      if (changedKeys.some((k) => watched.includes(k))) {
        this.broadcastState();
      }
    });

    // Also periodic metrics broadcast
    setInterval(() => {
      this.broadcastState();
    }, 400);
  }

  /**
   * Computes the URL for the remote controller.
   * @param {boolean} forMobile If true, resolves custom Wi-Fi host for phone pairing
   * @returns {string}
   */
  getRemoteUrl(forMobile = false) {
    if (typeof window === 'undefined') return './remote.html';
    try {
      const url = new URL(window.location.href);
      const cleanPath = url.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '');

      // On localhost (e.g. npx serve), /remote avoids 301 Moved Permanently redirects.
      // On static web hosts (e.g. GitHub Pages), /remote.html is the physical file.
      const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      const targetPath = isLocal ? '/remote' : '/remote.html';

      if (forMobile) {
        const customHost = (this._hostInputEl ? this._hostInputEl.value.trim() : '') ||
          localStorage.getItem('teleprompter_custom_remote_host');

        if (customHost) {
          const hostWithoutProto = customHost.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
          const hasPort = hostWithoutProto.includes(':');
          const portPart = (!hasPort && url.port) ? `:${url.port}` : '';
          return `${url.protocol}//${hostWithoutProto}${portPart}${cleanPath}${targetPath}`;
        }
      }

      return `${url.origin}${cleanPath}${targetPath}`;
    } catch {
      const base = window.location.href.replace(/index\.html$/, '').replace(/\/$/, '');
      return `${base}/remote.html`;
    }
  }

  /**
   * Opens the remote pairing QR modal.
   */
  async openModal() {
    if (!this._modalEl) return;
    this._modalEl.classList.remove('hidden');

    let isLocal = false;
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      } catch {}
    }

    // In production (GitHub Pages), hide host IP setup since phone accesses public domain directly
    if (this._hostSectionEl) {
      if (isLocal) {
        this._hostSectionEl.classList.remove('hidden');
      } else {
        this._hostSectionEl.classList.add('hidden');
      }
    }

    const saved = localStorage.getItem('teleprompter_custom_remote_host') || '';
    if (this._hostInputEl) {
      this._hostInputEl.value = saved;
    }

    // If on localhost and no saved custom host, attempt zero-dependency WebRTC auto-detection
    if (isLocal && !saved) {
      if (this._autoDetectBadgeEl) {
        this._autoDetectBadgeEl.textContent = '🔍 Detecting Wi-Fi IP...';
        this._autoDetectBadgeEl.style.color = 'var(--accent)';
        this._autoDetectBadgeEl.style.display = 'inline-block';
      }

      detectLocalIP().then((detected) => {
        if (detected && !localStorage.getItem('teleprompter_custom_remote_host')) {
          if (this._hostInputEl) {
            this._hostInputEl.value = detected;
          }
          if (this._autoDetectBadgeEl) {
            this._autoDetectBadgeEl.textContent = `✓ Detected: ${detected}`;
            this._autoDetectBadgeEl.style.color = '#22c55e';
            this._autoDetectBadgeEl.style.display = 'inline-block';
          }
          this.updatePairingView();
        } else if (this._autoDetectBadgeEl && !detected) {
          this._autoDetectBadgeEl.style.display = 'none';
        }
      }).catch(() => {
        if (this._autoDetectBadgeEl) {
          this._autoDetectBadgeEl.style.display = 'none';
        }
      });
    } else if (this._autoDetectBadgeEl) {
      this._autoDetectBadgeEl.style.display = 'none';
    }

    this.updatePairingView();
  }

  /**
   * Updates pairing URL input and redraws QR code.
   */
  updatePairingView() {
    const mobileUrl = this.getRemoteUrl(true);
    if (this._urlInputEl) {
      this._urlInputEl.value = mobileUrl;
    }

    if (this._qrContainerEl) {
      this._qrContainerEl.innerHTML = '';
      try {
        renderQRCode(this._qrContainerEl, mobileUrl, {
          width: 200,
          height: 200,
          colorDark: '#000000',
          colorLight: '#ffffff'
        });
      } catch (err) {
        console.error('[RemoteHost] Error rendering QR code:', err);
      }
    }
  }

  /**
   * Closes the remote pairing modal.
   */
  closeModal() {
    if (this._modalEl) {
      this._modalEl.classList.add('hidden');
    }
    if (this._copyFeedbackEl) {
      this._copyFeedbackEl.style.display = 'none';
    }
  }

  /**
   * Copies pairing URL to clipboard.
   */
  async copyPairingUrl() {
    const url = this.getRemoteUrl();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else if (this._urlInputEl) {
        this._urlInputEl.select();
        document.execCommand('copy');
      }
      if (this._copyFeedbackEl) {
        this._copyFeedbackEl.style.display = 'block';
        setTimeout(() => {
          if (this._copyFeedbackEl) this._copyFeedbackEl.style.display = 'none';
        }, 2500);
      }
    } catch (err) {
      console.warn('[RemoteHost] Clipboard copy failed:', err);
    }
  }

  /**
   * Opens remote controller in a dedicated presenter popup window.
   */
  openPopupRemote() {
    const url = this.getRemoteUrl();
    const width = 400;
    const height = 720;
    const left = window.screen.availWidth - width - 20;
    const top = 60;
    window.open(
      url,
      'TeleprompterRemote',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no`
    );
  }

  /**
   * Broadcasts the current prompter state to all connected remotes.
   */
  broadcastState() {
    const state = store.getState();
    const metrics = scroller.getMetrics();
    const payload = {
      isPlaying: !!state.isPlaying,
      isCountingDown: !!state.isCountingDown,
      wpm: state.wpm || 130,
      pace: metrics.pace || 'Conversational',
      progressPercent: metrics.progress || 0,
      remainingFormatted: metrics.remainingFormatted || '00:00',
      totalFormatted: metrics.totalFormatted || '00:00',
      isReverse: !!state.reverseScroll
    };

    // Skip if identical to last broadcast
    const serialized = JSON.stringify(payload);
    if (serialized === this._lastBroadcastState) return;
    this._lastBroadcastState = serialized;

    const message = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'PROMPTER_STATE',
      state: payload,
      timestamp: Date.now()
    };

    let sentViaChannel = false;
    if (this._channel) {
      try {
        this._channel.postMessage(message);
        sentViaChannel = true;
      } catch {
        // Channel may be closed
      }
    }

    // Only fallback to LocalStorage if BroadcastChannel was unavailable
    if (!sentViaChannel) {
      try {
        localStorage.setItem(
          REMOTE_STORAGE_KEY,
          JSON.stringify({ sender: 'host', payload: message, ts: Date.now() })
        );
      } catch {
        // Storage exceptions ignored
      }
    }
  }

  /**
   * Handles incoming commands from remote controller.
   * @param {Object} message
   * @private
   */
  _handleRemoteMessage(message) {
    if (!message || typeof message !== 'object') return;

    // Deduplicate incoming messages
    if (message.id) {
      if (this._seenMsgIds.has(message.id)) return;
      this._seenMsgIds.add(message.id);
      if (this._seenMsgIds.size > 50) {
        const [oldest] = this._seenMsgIds;
        this._seenMsgIds.delete(oldest);
      }
    }

    if (message.type === 'REMOTE_REQUEST_STATE') {
      this._lastBroadcastState = null;
      this.broadcastState();
      return;
    }

    if (message.type === 'REMOTE_COMMAND') {
      const { action, value } = message;

      // Debounce rapid toggle clicks (within 180ms)
      if (action === 'toggle') {
        const now = Date.now();
        if (now - this._lastToggleTime < 180) {
          return;
        }
        this._lastToggleTime = now;
      }

      switch (action) {
        case 'play':
          scroller.play();
          break;
        case 'pause':
          scroller.pause();
          break;
        case 'toggle':
          if (store.getState().isCountingDown) {
            scroller.cancelCountdown();
          } else {
            scroller.toggle();
          }
          break;
        case 'speed_delta': {
          const currentWpm = store.getState().wpm || 130;
          const newWpm = Math.max(60, Math.min(250, currentWpm + (Number(value) || 0)));
          const speed = scroller.calculateSpeedFromWpm(newWpm);
          store.setState({ wpm: newWpm, speed });
          break;
        }
        case 'set_wpm': {
          const newWpm = Math.max(60, Math.min(250, Number(value) || 130));
          const speed = scroller.calculateSpeedFromWpm(newWpm);
          store.setState({ wpm: newWpm, speed });
          break;
        }
        case 'rewind': {
          const cur = scroller.getScrollY();
          scroller.setScrollY(Math.max(0, cur - 160));
          break;
        }
        case 'forward': {
          const cur = scroller.getScrollY();
          scroller.setScrollY(cur + 160);
          break;
        }
        case 'reset':
          scroller.reset();
          break;
        case 'toggle_reverse':
          store.setState({ reverseScroll: !store.getState().reverseScroll });
          break;
      }
      this.broadcastState();
    }
  }
}

export const remoteHost = new RemoteHostController();
