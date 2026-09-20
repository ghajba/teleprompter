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
    this._lastBroadcastState = null;
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
        window.open(this.getRemoteUrl(), '_blank');
      });
    }
    if (this._copyBtnEl) {
      this._copyBtnEl.addEventListener('click', () => this.copyPairingUrl());
    }

    if (this._modalEl) {
      this._modalEl.addEventListener('click', (e) => {
        if (e.target === this._modalEl) {
          this.closeModal();
        }
      });
    }

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
   * @returns {string}
   */
  getRemoteUrl() {
    if (typeof window === 'undefined') return './remote.html';
    const base = window.location.href.replace(/index\.html$/, '').replace(/\/$/, '');
    return `${base}/remote.html`;
  }

  /**
   * Opens the remote pairing QR modal.
   */
  openModal() {
    if (!this._modalEl) return;
    this._modalEl.classList.remove('hidden');

    const url = this.getRemoteUrl();
    if (this._urlInputEl) {
      this._urlInputEl.value = url;
    }

    if (this._qrContainerEl) {
      this._qrContainerEl.innerHTML = '';
      renderQRCode(this._qrContainerEl, url, {
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff'
      });
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
      type: 'PROMPTER_STATE',
      state: payload,
      timestamp: Date.now()
    };

    if (this._channel) {
      try {
        this._channel.postMessage(message);
      } catch {
        // Channel may be closed
      }
    }

    try {
      localStorage.setItem(
        REMOTE_STORAGE_KEY,
        JSON.stringify({ sender: 'host', payload: message, ts: Date.now() })
      );
    } catch {
      // Storage exceptions ignored
    }
  }

  /**
   * Handles incoming commands from remote controller.
   * @param {Object} message
   * @private
   */
  _handleRemoteMessage(message) {
    if (!message || typeof message !== 'object') return;

    if (message.type === 'REMOTE_REQUEST_STATE') {
      this._lastBroadcastState = null;
      this.broadcastState();
      return;
    }

    if (message.type === 'REMOTE_COMMAND') {
      const { action, value } = message;
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
