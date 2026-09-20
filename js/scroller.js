/**
 * High-performance 60+ FPS sub-pixel scroll engine.
 * Driven by requestAnimationFrame and GPU-accelerated CSS translateY transforms.
 * Supports countdown timer, bidirectional scrolling, and real-time reading metrics.
 */

import { store } from './state.js';
import { stripMarkdown } from './markdown.js';

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
    this._lastCountdownCancelTime = 0;

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
      if (changedKeys.includes('text') || changedKeys.includes('fontSize') || changedKeys.includes('marginWidth')) {
        // Defer scroll boundary calculation slightly to let DOM layout settle
        setTimeout(() => this._updateMaxScroll(), 20);
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

    if (this._countdownOverlayEl) {
      // Tapping or clicking the countdown overlay cancels the countdown immediately
      const cancelFromOverlay = (e) => {
        if (store.getState().isCountingDown) {
          if (e.cancelable) {
            e.preventDefault();
          }
          e.stopPropagation();
          this.cancelCountdown();
        }
      };
      this._countdownOverlayEl.addEventListener('click', cancelFromOverlay);
      this._countdownOverlayEl.addEventListener('touchend', cancelFromOverlay);
    }

    this._updateMaxScroll();
    this.render();

    window.addEventListener('resize', () => {
      this._updateMaxScroll();
    });
  }

  /**
   * Public hook to recalculate scroll boundaries whenever text or styling changes.
   */
  updateBounds() {
    this._updateMaxScroll();
  }

  /**
   * Recalculates maximum scrollable distance based on actual rendered text height.
   * The text should be able to scroll until the very last line passes the eyeline guide.
   * @private
   */
  _updateMaxScroll() {
    if (!this._contentEl || typeof window === 'undefined') return;

    try {
      const inner = this._contentEl.querySelector('.prompter-text-inner') || this._contentEl;
      const rawHeight = inner ? (inner.offsetHeight || inner.scrollHeight || 0) : 0;
      const viewportHeight = window.innerHeight || 800;

      // Fallback estimate based on word count if layout has not completed yet
      const text = store.getState().text || '';
      const cleanText = stripMarkdown(text);
      const words = cleanText ? cleanText.split(/\s+/).length : 0;
      const estimatedHeight = Math.max(300, words * 12);
      const textHeight = rawHeight > 50 ? rawHeight : estimatedHeight;

      // The text must scroll its full height so the final line reaches the eyeline,
      // plus a 40% viewport height reading cushion so the speaker finishes speaking comfortably
      this._maxScrollY = Math.max(300, Math.round(textHeight + (viewportHeight * 0.4)));
    } catch {
      this._maxScrollY = 3000;
    }
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

      // Clamp lower scroll boundary
      if (this._scrollY < 0) {
        this._scrollY = 0;
      }

      // If reached the end of the text, gracefully stop at the boundary
      if (this._maxScrollY > 0 && this._scrollY >= this._maxScrollY) {
        this._scrollY = this._maxScrollY;
        this.render();
        this.pause();
        return;
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
    const cleanText = stripMarkdown(text);
    const words = cleanText ? cleanText.split(/\s+/).length : 0;

    const progress = this.getProgressPercent();
    const remainingScroll = Math.max(0, this._maxScrollY - this._scrollY);

    // Accurate remaining time based on actual remaining scroll distance
    const remainingSeconds = speed > 0 ? Math.round(remainingScroll / speed) : 0;
    const elapsedSeconds = speed > 0 ? Math.round(this._scrollY / speed) : 0;

    // Approximate WPM based on total script words and estimated total duration
    const totalEstimatedSeconds = speed > 0 ? Math.round(this._maxScrollY / speed) : 0;
    const estimatedMinutes = totalEstimatedSeconds / 60;
    const rawWpm = (estimatedMinutes > 0 && words > 0) ? Math.round(words / estimatedMinutes) : 130;

    return {
      words,
      wpm: Math.min(Math.max(rawWpm, 50), 300),
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
   * Directly sets the vertical scroll position (with boundary clamping).
   * @param {number} y 
   */
  setScrollY(y) {
    const max = this._maxScrollY > 0 ? this._maxScrollY : 10000;
    this._scrollY = Math.max(0, Math.min(y, max));
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
   * Starts playback.
   * If already at or past the end of the text, automatically restarts from top.
   */
  play() {
    const { countdownDuration } = store.getState();

    // If script reached the end, automatically rewind to start
    if (this._maxScrollY > 0 && this._scrollY >= this._maxScrollY) {
      this.reset();
    }

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
   * Cancels any active countdown timer and resets overlay state.
   */
  cancelCountdown() {
    this._cancelCountdown();
  }

  /**
   * Returns timestamp of when countdown was last cancelled.
   * Useful to debounce or prevent ghost click events after overlay dismiss.
   * @returns {number}
   */
  getLastCountdownCancelTime() {
    return this._lastCountdownCancelTime;
  }

  /**
   * Cancels any active countdown timer and hides overlay.
   * @private
   */
  _cancelCountdown() {
    this._lastCountdownCancelTime = Date.now();
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
