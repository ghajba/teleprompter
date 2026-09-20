/**
 * High-performance 60+ FPS sub-pixel scroll engine.
 * Driven by requestAnimationFrame and GPU-accelerated CSS translateY transforms.
 * Supports countdown timer, bidirectional scrolling, and real-time reading metrics.
 */

import { store } from './state.js';

class ScrollerEngine {
  constructor() {
    this._scrollY = 0;
    this._contentEl = null;
    this._progressBarEl = null;
    this._countdownOverlayEl = null;

    this._rafId = null;
    this._lastTimestamp = null;
    this._maxScrollY = 0;

    this._countdownTimerId = null;
    this._countdownSecondsLeft = 0;

    // Listen to store updates
    store.subscribe((state, changedKeys) => {
      if (changedKeys.includes('isPlaying')) {
        if (state.isPlaying) {
          this._cancelCountdown();
          this._startLoop();
        } else {
          this._stopLoop();
        }
      }
      if (changedKeys.includes('text')) {
        this._updateMaxScroll();
      }
    });
  }

  /**
   * Mounts the scrolling engine to the target content DOM element and optional UI aids.
   * @param {Object} elements
   * @param {HTMLElement} elements.contentEl
   * @param {HTMLElement} [elements.progressBarEl]
   * @param {HTMLElement} [elements.countdownOverlayEl]
   */
  init(elements) {
    this._contentEl = elements.contentEl;
    this._progressBarEl = elements.progressBarEl || null;
    this._countdownOverlayEl = elements.countdownOverlayEl || null;

    this._updateMaxScroll();
    this.render();

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
    const viewportHeight = window.innerHeight || 800;
    // Allow text to scroll completely past the eyeline
    this._maxScrollY = Math.max(0, contentHeight - (viewportHeight * 0.2));
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

    const { isPlaying, speed, reverseScroll } = store.getState();

    if (isPlaying && speed > 0) {
      const direction = reverseScroll ? -1 : 1;
      this._scrollY += direction * speed * dt;

      // Clamp scroll boundaries
      if (this._scrollY < 0) {
        this._scrollY = 0;
      }
      if (this._maxScrollY > 0 && this._scrollY > this._maxScrollY + 200) {
        // Automatically pause when text reaches the end
        this.pause();
      }

      this.render();
    }

    if (store.getState().isPlaying) {
      this._rafId = requestAnimationFrame(this._step);
    } else {
      this._stopLoop();
    }
  }

  /**
   * Applies the current sub-pixel scroll position to the GPU layer and updates progress.
   */
  render() {
    if (this._contentEl) {
      this._contentEl.style.transform = `translateY(-${this._scrollY.toFixed(2)}px)`;
    }

    // Update progress bar
    if (this._progressBarEl) {
      const percent = this.getProgressPercent();
      this._progressBarEl.style.width = `${percent}%`;
    }
  }

  /**
   * Returns current scroll progress as a percentage (0 to 100).
   * @returns {number}
   */
  getProgressPercent() {
    if (!this._maxScrollY || this._maxScrollY <= 0) return 0;
    return Math.min(100, Math.max(0, (this._scrollY / this._maxScrollY) * 100));
  }

  /**
   * Calculates real-time reading metrics: WPM, elapsed time, and remaining time.
   * @returns {{ words: number, wpm: number, remainingFormatted: string, elapsedFormatted: string, progress: number }}
   */
  getMetrics() {
    const text = store.getState().text || '';
    const speed = store.getState().speed || 35; // px per sec
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;

    const progress = this.getProgressPercent();
    const remainingScroll = Math.max(0, this._maxScrollY - this._scrollY);

    // Approximate time based on pixels remaining and speed
    const remainingSeconds = speed > 0 ? Math.round(remainingScroll / speed) : 0;
    const elapsedSeconds = speed > 0 ? Math.round(this._scrollY / speed) : 0;
    const totalEstimatedSeconds = elapsedSeconds + remainingSeconds;

    // Estimate WPM based on total script words and estimated total duration
    const estimatedMinutes = totalEstimatedSeconds / 60;
    const wpm = estimatedMinutes > 0 ? Math.round(words / estimatedMinutes) : 130;

    return {
      words,
      wpm: Math.min(Math.max(wpm, 40), 400),
      remainingSeconds,
      elapsedSeconds,
      remainingFormatted: this._formatTime(remainingSeconds),
      elapsedFormatted: this._formatTime(elapsedSeconds),
      progress: Math.round(progress)
    };
  }

  /**
   * Formats seconds into MM:SS.
   * @private
   */
  _formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Resets the scroll position back to the top (0).
   */
  reset() {
    this._cancelCountdown();
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
   * Toggles play/pause state. Triggers countdown if enabled and currently stopped.
   */
  toggle() {
    const { isPlaying, isCountingDown } = store.getState();
    if (isCountingDown) {
      this._cancelCountdown();
      return;
    }

    if (isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Starts playback with optional countdown.
   */
  play() {
    const { countdownDuration } = store.getState();

    if (countdownDuration > 0 && this._scrollY === 0) {
      this._startCountdown(countdownDuration);
    } else {
      store.setState({ isPlaying: true });
    }
  }

  /**
   * Pauses playback.
   */
  pause() {
    this._cancelCountdown();
    store.setState({ isPlaying: false });
  }

  /**
   * Starts visual countdown animation overlay before beginning scroll.
   * @private
   */
  _startCountdown(seconds) {
    this._cancelCountdown();
    this._countdownSecondsLeft = seconds;
    store.setState({ isCountingDown: true });

    this._updateCountdownDisplay(this._countdownSecondsLeft);

    this._countdownTimerId = setInterval(() => {
      this._countdownSecondsLeft -= 1;

      if (this._countdownSecondsLeft > 0) {
        this._updateCountdownDisplay(this._countdownSecondsLeft);
      } else if (this._countdownSecondsLeft === 0) {
        this._updateCountdownDisplay('GO!');
      } else {
        this._cancelCountdown();
        store.setState({ isPlaying: true });
      }
    }, 1000);
  }

  /**
   * Cancels any active countdown timer and hides overlay.
   * @private
   */
  _cancelCountdown() {
    if (this._countdownTimerId) {
      clearInterval(this._countdownTimerId);
      this._countdownTimerId = null;
    }
    if (this._countdownOverlayEl) {
      this._countdownOverlayEl.classList.remove('active');
    }
    store.setState({ isCountingDown: false });
  }

  /**
   * Updates visual countdown overlay DOM element.
   * @private
   */
  _updateCountdownDisplay(value) {
    if (!this._countdownOverlayEl) return;
    this._countdownOverlayEl.classList.add('active');
    const numberEl = this._countdownOverlayEl.querySelector('.countdown-number');
    if (numberEl) {
      numberEl.textContent = value;
      // Re-trigger CSS animation
      numberEl.classList.remove('pulse');
      void numberEl.offsetWidth; // trigger reflow
      numberEl.classList.add('pulse');
    }
  }
}

export const scroller = new ScrollerEngine();
