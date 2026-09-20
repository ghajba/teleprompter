/**
 * Centralized reactive state store for the Teleprompter application.
 * Manages configuration, script text, playback status, and auto-saves to localStorage.
 */

import { saveItem, loadItem, debounce } from './storage.js';

export const STORAGE_KEYS = {
  CONFIG: 'config',
  SCRIPT: 'script'
};

export const DEFAULT_STATE = Object.freeze({
  text: `Welcome to Teleprompter Web App!

You can paste or edit your presentation script directly here.

Key features:
• Smooth, jitter-free 60+ FPS sub-pixel scrolling
• Translucent collapsible control drawer
• Horizontal mirroring for prompter beam-splitter glass
• Adjustable reading margin, font sizes, and contrast themes
• Visual eyeline focus guide to maintain eye contact
• 100% offline-first PWA with local auto-save

Press SPACE to start or pause scrolling.
Use UP / DOWN arrow keys to adjust speed on the fly.
Press R or HOME to reset to the top.`,
  speed: 35, // pixels per second
  isPlaying: false,
  isMirrored: false,
  fontSize: 48, // in pixels
  fontFamily: 'system-ui',
  textColor: '#ffffff',
  bgColor: '#000000',
  marginWidth: 75, // percentage of viewport width (40% - 100%)
  eyelinePosition: 35 // percentage from top of screen (15% - 70%)
});

// Non-persisted runtime keys (should always reset to default on launch)
const TRANSIENT_KEYS = new Set(['isPlaying']);

class StateStore {
  constructor() {
    this._listeners = new Set();
    this._state = this._loadInitialState();

    // Debounced disk sync (300ms) to avoid spamming localStorage during rapid typing or slider drag
    this._debouncedSave = debounce(() => {
      this._saveToStorage();
    }, 300);
  }

  /**
   * Loads persisted settings and text, merged with defaults.
   * @private
   */
  _loadInitialState() {
    const savedConfig = loadItem(STORAGE_KEYS.CONFIG, {});
    const savedText = loadItem(STORAGE_KEYS.SCRIPT, null);

    return {
      ...DEFAULT_STATE,
      ...savedConfig,
      ...(savedText !== null ? { text: savedText } : {}),
      // Ensure transient keys always start at default
      isPlaying: false
    };
  }

  /**
   * Saves persistent state keys to localStorage.
   * @private
   */
  _saveToStorage() {
    const configToSave = {};
    for (const key of Object.keys(this._state)) {
      if (key !== 'text' && !TRANSIENT_KEYS.has(key)) {
        configToSave[key] = this._state[key];
      }
    }
    saveItem(STORAGE_KEYS.CONFIG, configToSave);
    saveItem(STORAGE_KEYS.SCRIPT, this._state.text);
  }

  /**
   * Returns a shallow copy snapshot of current state.
   * @returns {typeof DEFAULT_STATE}
   */
  getState() {
    return { ...this._state };
  }

  /**
   * Updates state with partial changes, notifies subscribers, and triggers persistence.
   * @param {Partial<typeof DEFAULT_STATE>} partialState 
   */
  setState(partialState) {
    if (!partialState || typeof partialState !== 'object') return;

    const changedKeys = [];
    const prevState = { ...this._state };

    for (const [key, value] of Object.entries(partialState)) {
      if (key in this._state && this._state[key] !== value) {
        this._state[key] = value;
        changedKeys.push(key);
      }
    }

    if (changedKeys.length === 0) return;

    // Check if any persisted keys changed
    const hasPersistentChanges = changedKeys.some(k => !TRANSIENT_KEYS.has(k));
    if (hasPersistentChanges) {
      this._debouncedSave();
    }

    // Notify listeners
    this._notify(changedKeys, prevState);
  }

  /**
   * Subscribes a callback to state changes.
   * @param {(currentState: typeof DEFAULT_STATE, changedKeys: string[], prevState: typeof DEFAULT_STATE) => void} listener 
   * @returns {() => void} Unsubscribe function
   */
  subscribe(listener) {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  /**
   * @private
   */
  _notify(changedKeys, prevState) {
    const currentState = this.getState();
    for (const listener of this._listeners) {
      try {
        listener(currentState, changedKeys, prevState);
      } catch (err) {
        console.error('[StateStore] Error in subscriber listener:', err);
      }
    }
  }

  /**
   * Resets configuration options back to defaults, optionally keeping the script text.
   * @param {boolean} keepText If true, keeps user script intact
   */
  resetToDefaults(keepText = true) {
    const currentText = this._state.text;
    const newState = {
      ...DEFAULT_STATE,
      ...(keepText ? { text: currentText } : {})
    };
    this.setState(newState);
  }
}

// Singleton state store instance
export const store = new StateStore();
