/**
 * Reading Highlight Controller:
 * Tracks active text line/block intersecting the eyeline coordinate,
 * manages dimming of inactive lines, and synchronizes voice follow focus.
 */

import { store } from './state.js';

export class ReadingHighlightController {
  constructor() {
    this._containerEl = null;
    this._textInnerEl = null;
    this._activeElement = null;
    this._updateScheduled = false;
  }

  /**
   * Initializes highlight controller with container and inner text elements.
   * @param {Object} elements
   * @param {HTMLElement} elements.containerEl
   * @param {HTMLElement} elements.textInnerEl
   */
  init(elements) {
    this._containerEl = elements.containerEl;
    this._textInnerEl = elements.textInnerEl;

    // Listen to state changes for highlight mode
    store.subscribe((state, changedKeys) => {
      if (changedKeys.includes('readingHighlightMode')) {
        this.applyMode(state.readingHighlightMode);
      }
      if (changedKeys.includes('eyelinePosition')) {
        this.updateFocus();
      }
    });

    this.applyMode(store.getState().readingHighlightMode || 'none');
  }

  /**
   * Updates CSS classes on container element based on selected mode.
   * @param {'none' | 'dim' | 'accent'} mode
   */
  applyMode(mode) {
    if (!this._containerEl) return;
    this._containerEl.classList.remove('highlight-mode-none', 'highlight-mode-dim', 'highlight-mode-accent');
    this._containerEl.classList.add(`highlight-mode-${mode || 'none'}`);
    this.updateFocus();
  }

  /**
   * Schedules a focus calculation on next animation frame.
   */
  scheduleUpdate() {
    if (this._updateScheduled) return;
    this._updateScheduled = true;
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => {
        this._updateScheduled = false;
        this.updateFocus();
      });
    } else {
      this._updateScheduled = false;
      this.updateFocus();
    }
  }

  /**
   * Calculates which text block is currently intersecting the eyeline.
   */
  updateFocus() {
    const mode = store.getState().readingHighlightMode || 'none';
    if (mode === 'none' || !this._textInnerEl) {
      this._clearFocus();
      return;
    }

    const eyelinePercent = store.getState().eyelinePosition || 35;
    const eyelineY = typeof window !== 'undefined' ? (window.innerHeight * eyelinePercent) / 100 : 280;

    // Find all readable block children
    const blocks = Array.from(this._textInnerEl.children).filter(
      (el) => !el.classList.contains('prompter-line-break')
    );

    if (blocks.length === 0) return;

    let closestEl = null;
    let minDistance = Infinity;

    for (const el of blocks) {
      if (typeof el.getBoundingClientRect !== 'function') continue;
      const rect = el.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const dist = Math.abs(midY - eyelineY);

      if (dist < minDistance) {
        minDistance = dist;
        closestEl = el;
      }
    }

    if (closestEl && closestEl !== this._activeElement) {
      if (this._activeElement) {
        this._activeElement.classList.remove('is-focused');
      }
      closestEl.classList.add('is-focused');
      this._activeElement = closestEl;
    }
  }

  /**
   * Sets focus directly to a specific DOM element (e.g. from Voice Follow matcher).
   * @param {HTMLElement} el
   */
  focusElement(el) {
    if (!el || el === this._activeElement) return;
    if (this._activeElement) {
      this._activeElement.classList.remove('is-focused');
    }
    el.classList.add('is-focused');
    this._activeElement = el;
  }

  /**
   * Clears active focus classes.
   * @private
   */
  _clearFocus() {
    if (this._activeElement) {
      this._activeElement.classList.remove('is-focused');
      this._activeElement = null;
    }
  }
}

export const highlightController = new ReadingHighlightController();
