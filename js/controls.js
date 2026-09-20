/**
 * Keyboard shortcuts, mouse wheel scrolling, and touch gesture handlers.
 */

import { store } from './state.js';
import { scroller } from './scroller.js';

export function isTouchDevice() {
  return typeof window !== 'undefined' && Boolean(
    ('ontouchstart' in window) ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
    (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches)
  );
}

export class ControlsManager {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.prompterContainer
   * @param {() => boolean} options.isDrawerOpen
   * @param {() => void} options.closeDrawer
   */
  constructor(options) {
    this._container = options.prompterContainer;
    this._isDrawerOpen = options.isDrawerOpen;
    this._closeDrawer = options.closeDrawer;

    this._touchStartY = null;
    this._touchStartScrollY = 0;
    this._touchMoved = false;

    this._btnTouchRewind = null;
    this._btnTouchPlayPause = null;
    this._btnTouchSpeedDown = null;
    this._btnTouchSpeedUp = null;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onContainerClick = this._onContainerClick.bind(this);
    this._onWheel = this._onWheel.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
  }

  init() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('wheel', this._onWheel, { passive: false });
    window.addEventListener('touchstart', this._onTouchStart, { passive: true });
    window.addEventListener('touchmove', this._onTouchMove, { passive: false });
    window.addEventListener('touchend', this._onTouchEnd, { passive: true });

    if (this._container) {
      this._container.addEventListener('click', this._onContainerClick);
    }

    // Floating touch controls toolbar buttons
    this._btnTouchRewind = document.getElementById('btnTouchRewind');
    this._btnTouchPlayPause = document.getElementById('btnTouchPlayPause');
    this._btnTouchSpeedDown = document.getElementById('btnTouchSpeedDown');
    this._btnTouchSpeedUp = document.getElementById('btnTouchSpeedUp');

    if (this._btnTouchRewind) {
      this._btnTouchRewind.addEventListener('click', (e) => {
        e.stopPropagation();
        scroller.reset();
      });
    }
    if (this._btnTouchPlayPause) {
      this._btnTouchPlayPause.addEventListener('click', (e) => {
        e.stopPropagation();
        scroller.toggle();
      });
    }
    if (this._btnTouchSpeedDown) {
      this._btnTouchSpeedDown.addEventListener('click', (e) => {
        e.stopPropagation();
        this._adjustSpeed(-5);
      });
    }
    if (this._btnTouchSpeedUp) {
      this._btnTouchSpeedUp.addEventListener('click', (e) => {
        e.stopPropagation();
        this._adjustSpeed(5);
      });
    }

    // Sync touch play/pause button state with store
    store.subscribe((state, changedKeys) => {
      if ((changedKeys.includes('isPlaying') || changedKeys.includes('isCountingDown')) && this._btnTouchPlayPause) {
        if (state.isCountingDown) {
          this._btnTouchPlayPause.textContent = '⏹';
          this._btnTouchPlayPause.setAttribute('title', 'Cancel countdown');
        } else if (state.isPlaying) {
          this._btnTouchPlayPause.textContent = '⏸';
          this._btnTouchPlayPause.setAttribute('title', 'Pause');
        } else {
          this._btnTouchPlayPause.textContent = '⏯';
          this._btnTouchPlayPause.setAttribute('title', 'Play');
        }
      }
    });
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('wheel', this._onWheel);
    window.removeEventListener('touchstart', this._onTouchStart);
    window.removeEventListener('touchmove', this._onTouchMove);
    window.removeEventListener('touchend', this._onTouchEnd);

    if (this._container) {
      this._container.removeEventListener('click', this._onContainerClick);
    }
  }

  /**
   * Handles mouse wheel and trackpad scroll on the prompter canvas.
   * @param {WheelEvent} e 
   * @private
   */
  _onWheel(e) {
    // If mouse is interacting with the drawer, modal, or an active input, allow normal scrolling
    if (e.target.closest('#drawer') || e.target.closest('#welcomeModal') || e.target.closest('textarea') || e.target.closest('input')) {
      return;
    }

    e.preventDefault();
    const currentScroll = scroller.getScrollY();
    scroller.setScrollY(currentScroll + e.deltaY);
  }

  /**
   * Touch drag handlers for mobile and tablet touchscreens.
   * @private
   */
  _onTouchStart(e) {
    if (store.getState().isCountingDown) {
      scroller.cancelCountdown();
      return;
    }
    if (e.target.closest('#drawer') || e.target.closest('#welcomeModal') || e.target.closest('#touchControls') || e.target.closest('button')) {
      return;
    }
    this._touchStartY = e.touches[0].clientY;
    this._touchStartScrollY = scroller.getScrollY();
    this._touchMoved = false;
  }

  _onTouchMove(e) {
    if (this._touchStartY === null || e.target.closest('#drawer') || e.target.closest('#welcomeModal') || e.target.closest('#touchControls')) {
      return;
    }
    const currentY = e.touches[0].clientY;
    const deltaY = this._touchStartY - currentY;
    if (Math.abs(deltaY) > 6) {
      e.preventDefault();
      this._touchMoved = true;
      scroller.setScrollY(this._touchStartScrollY + deltaY);
    }
  }

  _onTouchEnd() {
    this._touchStartY = null;
  }

  /**
   * Checks whether the event originated from an active editable input.
   * @param {KeyboardEvent} e 
   * @returns {boolean}
   */
  _isEditing(e) {
    const active = document.activeElement;
    if (!active) return false;
    const tag = active.tagName.toLowerCase();
    return tag === 'textarea' || tag === 'input' || active.isContentEditable;
  }

  /**
   * Global keyboard shortcut handler.
   * @param {KeyboardEvent} e 
   */
  _onKeyDown(e) {
    // If user is actively typing in a text field, allow normal typing
    if (this._isEditing(e)) {
      if (e.key === 'Escape') {
        document.activeElement.blur();
        if (this._closeDrawer) this._closeDrawer();
      }
      return;
    }

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        scroller.toggle();
        break;

      case 'ArrowUp':
      case 'BracketRight': // ']' key
        e.preventDefault();
        this._adjustSpeed(5);
        break;

      case 'ArrowDown':
      case 'BracketLeft': // '[' key
        e.preventDefault();
        this._adjustSpeed(-5);
        break;

      case 'Home':
      case 'KeyR':
        e.preventDefault();
        scroller.reset();
        break;

      case 'PageUp':
      case 'ArrowLeft':
        e.preventDefault();
        scroller.setScrollY(scroller.getScrollY() - 160);
        break;

      case 'PageDown':
      case 'ArrowRight':
        e.preventDefault();
        scroller.setScrollY(scroller.getScrollY() + 160);
        break;

      case 'KeyB': // Toggle reverse scrolling
        e.preventDefault();
        store.setState({ reverseScroll: !store.getState().reverseScroll });
        break;

      case 'KeyF':
        e.preventDefault();
        this.toggleFullscreen();
        break;

      case 'Escape':
        if (store.getState().isCountingDown) {
          e.preventDefault();
          scroller.cancelCountdown();
          return;
        }
        if (this._isDrawerOpen && this._isDrawerOpen()) {
          if (this._closeDrawer) this._closeDrawer();
        }
        break;
    }
  }

  /**
   * Increments or decrements speed by a delta step.
   * @param {number} delta 
   */
  _adjustSpeed(delta) {
    const currentSpeed = store.getState().speed;
    const newSpeed = Math.min(Math.max(5, currentSpeed + delta), 150);
    store.setState({ speed: newSpeed });
  }

  /**
   * Toggles browser fullscreen mode.
   */
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('[Controls] Fullscreen request failed:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.warn('[Controls] Exit fullscreen failed:', err);
        });
      }
    }
  }

  /**
   * Viewport canvas click handler: toggles play/pause when user clicks outside controls.
   * @param {MouseEvent} e 
   */
  _onContainerClick(e) {
    if (this._touchMoved) {
      this._touchMoved = false;
      return;
    }
    // If countdown is running, cancel it immediately
    if (store.getState().isCountingDown) {
      scroller.cancelCountdown();
      return;
    }
    // Debounce ghost clicks within 400ms of countdown cancellation
    if (Date.now() - scroller.getLastCountdownCancelTime() < 400) {
      return;
    }
    // Do not trigger if clicking on interactive widgets, modal, touch controls, or drawer
    if (e.target.closest('#drawer') || e.target.closest('#welcomeModal') || e.target.closest('#touchControls') || e.target.closest('#drawerToggle') || e.target.closest('button') || e.target.closest('input')) {
      return;
    }
    scroller.toggle();
  }
}
