/**
 * Keyboard shortcuts and prompter viewport click interaction handlers.
 */

import { store } from './state.js';
import { scroller } from './scroller.js';

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

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onContainerClick = this._onContainerClick.bind(this);
  }

  init() {
    window.addEventListener('keydown', this._onKeyDown);
    if (this._container) {
      this._container.addEventListener('click', this._onContainerClick);
    }
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    if (this._container) {
      this._container.removeEventListener('click', this._onContainerClick);
    }
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
        // Blur input and optionally close drawer on Esc
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

      case 'KeyF':
        e.preventDefault();
        this.toggleFullscreen();
        break;

      case 'Escape':
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
    // Do not trigger if clicking on interactive widgets or drawer
    if (e.target.closest('#drawer') || e.target.closest('#drawerToggle') || e.target.closest('button') || e.target.closest('input')) {
      return;
    }
    scroller.toggle();
  }
}
