/**
 * High-performance 60+ FPS sub-pixel scroll engine.
 * Driven by requestAnimationFrame and GPU-accelerated CSS translateY transforms.
 */

import { store } from './state.js';

class ScrollerEngine {
  constructor() {
    this._scrollY = 0;
    this._contentEl = null;
    this._rafId = null;
    this._lastTimestamp = null;
    this._maxScrollY = 0;

    // Listen to store updates
    store.subscribe((state, changedKeys) => {
      if (changedKeys.includes('isPlaying')) {
        if (state.isPlaying) {
          this._startLoop();
        } else {
          this._stopLoop();
        }
      }
    });
  }

  /**
   * Mounts the scrolling engine to the target content DOM element.
   * @param {HTMLElement} contentEl 
   */
  init(contentEl) {
    this._contentEl = contentEl;
    this._updateMaxScroll();
    this.render();

    // Recalculate dimensions on window resize
    window.addEventListener('resize', () => {
      this._updateMaxScroll();
    });
  }

  /**
   * Recalculates maximum scrollable distance based on content height.
   * @private
   */
  _updateMaxScroll() {
    if (!this._contentEl) return;
    const contentHeight = this._contentEl.scrollHeight;
    // Allow scrolling until content is past the screen
    this._maxScrollY = Math.max(0, contentHeight);
  }

  /**
   * Starts the rAF animation loop.
   * @private
   */
  _startLoop() {
    if (this._rafId) return;
    this._lastTimestamp = performance.now();
    this._step = this._step.bind(this);
    this._rafId = requestAnimationFrame(this._step);
  }

  /**
   * Stops the rAF animation loop.
   * @private
   */
  _stopLoop() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._lastTimestamp = null;
  }

  /**
   * Per-frame step calculation with delta-time.
   * @param {DOMHighResTimeStamp} timestamp 
   * @private
   */
  _step(timestamp) {
    if (!this._lastTimestamp) {
      this._lastTimestamp = timestamp;
    }

    const dt = Math.min((timestamp - this._lastTimestamp) / 1000, 0.1); // Clamp dt to max 100ms
    this._lastTimestamp = timestamp;

    const { isPlaying, speed } = store.getState();

    if (isPlaying && speed > 0) {
      this._scrollY += speed * dt;
      this.render();
    }

    if (store.getState().isPlaying) {
      this._rafId = requestAnimationFrame(this._step);
    } else {
      this._stopLoop();
    }
  }

  /**
   * Applies the current sub-pixel scroll position to the GPU layer.
   */
  render() {
    if (!this._contentEl) return;
    this._contentEl.style.transform = `translateY(-${this._scrollY.toFixed(2)}px)`;
  }

  /**
   * Resets the scroll position back to the top (0).
   */
  reset() {
    this._scrollY = 0;
    this.render();
  }

  /**
   * Directly sets the vertical scroll position.
   * @param {number} y 
   */
  setScrollY(y) {
    this._scrollY = Math.max(0, y);
    this.render();
  }

  /**
   * Returns current vertical scroll position.
   * @returns {number}
   */
  getScrollY() {
    return this._scrollY;
  }

  /**
   * Toggles play/pause state in store.
   */
  toggle() {
    const isPlaying = store.getState().isPlaying;
    store.setState({ isPlaying: !isPlaying });
  }

  /**
   * Starts playback.
   */
  play() {
    store.setState({ isPlaying: true });
  }

  /**
   * Pauses playback.
   */
  pause() {
    store.setState({ isPlaying: false });
  }
}

export const scroller = new ScrollerEngine();
