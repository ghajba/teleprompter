/**
 * Centralized reactive state store for the Teleprompter application.
 * Manages configuration, script text, playback status, and auto-saves to localStorage.
 */

import { saveItem, loadItem, debounce } from './storage.js';

export const STORAGE_KEYS = {
  CONFIG: 'config',
  SCRIPT: 'script'
};

export const WELCOME_DEMO_SCRIPT = `# Welcome to Teleprompter

A **lightweight**, privacy-focused teleprompter built for smooth **60+ FPS scrolling** and professional presentation workflows.

## Why Creators Choose Us
- ⚡ **60+ FPS Fluid Motion:** GPU sub-pixel precision for jitter-free reading.
- 🔒 **100% Offline & Private:** Zero tracking. Your scripts stay strictly in local storage.
- 🪞 **Physical Glass Mirroring:** Reflection flip for beam-splitter prompter glass rigs.
- 📱 **PWA & Adaptive Controls:** Touch gestures and keyboard shortcuts.

[Take a breath, smile, and look at the camera]

---

## Quick Navigation
• Tap screen or press **SPACE** to start or pause.
• Drag finger or use **Mouse Wheel / Arrow keys** to scroll.
• Open **Settings (⚙️)** to paste your script, adjust speed, and customize colors.

[Pause for 2 seconds]

To enter your presentation speech, open ⚙️ **Settings & Script** anytime!`;

export const DEFAULT_STATE = Object.freeze({
  text: WELCOME_DEMO_SCRIPT,
  wpm: 130, // Words per minute (human speech pace: 60 - 250)
  speed: 35, // pixels per second (internally computed from wpm & layout)
  isPlaying: false,
  isMirrored: false,
  fontSize: 48, // in pixels
  fontFamily: 'system-ui',
  textColor: '#ffffff',
  bgColor: '#000000',
  marginWidth: 75, // percentage of viewport width (40% - 100%)
  eyelinePosition: 35, // percentage from top of screen (15% - 70%)
  countdownDuration: 3, // countdown seconds before starting (0, 3, 5)
  countdownShowScript: true, // keep script visible without blur during countdown
  showProgressBar: true, // visual reading progress bar at top of screen
  showTouchControls: false, // on-screen floating touch controls (play, speed, rewind)
  renderMarkdown: true, // render rich Markdown formatting (headings, bold, cues)
  readingHighlightMode: 'none', // visual focus mode ('none', 'dim', 'accent')
  voiceFollowEnabled: false, // voice recognition automatic scrolling
  voiceLanguage: 'auto', // voice language ('auto', 'hu-HU', 'en-US')
  reverseScroll: false, // backwards scrolling flag
  isCountingDown: false // active countdown status
});

/**
 * Checks if the current environment is running on a touch-enabled or small mobile screen device.
 * @returns {boolean}
 */
export function isMobileDevice() {
  return typeof window !== 'undefined' && Boolean(
    ('ontouchstart' in window) ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
    (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches) ||
    (typeof window.innerWidth === 'number' && window.innerWidth <= 768)
  );
}

// Non-persisted runtime keys (should always reset to default on launch)
const TRANSIENT_KEYS = new Set(['isPlaying', 'reverseScroll', 'isCountingDown']);

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

    const isTouch = isMobileDevice();

    // On mobile screens, starting font size is 44px (desktop default is 48px)
    const defaultFontSize = isTouch ? 44 : DEFAULT_STATE.fontSize;
    let resolvedFontSize = savedConfig.fontSize !== undefined ? savedConfig.fontSize : defaultFontSize;
    if (isTouch && (resolvedFontSize === 70 || resolvedFontSize === 48)) {
      resolvedFontSize = 44;
    }

    return {
      ...DEFAULT_STATE,
      fontSize: resolvedFontSize,
      showTouchControls: isTouch,
      ...savedConfig,
      fontSize: resolvedFontSize,
      ...(savedText !== null ? { text: savedText } : {}),
      // Ensure transient keys always start at default
      isPlaying: false,
      reverseScroll: false,
      isCountingDown: false
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
    const isTouch = isMobileDevice();
    const defaultFontSize = isTouch ? 44 : DEFAULT_STATE.fontSize;
    const currentText = this._state.text;
    const newState = {
      ...DEFAULT_STATE,
      fontSize: defaultFontSize,
      showTouchControls: isTouch,
      ...(keepText ? { text: currentText } : {})
    };
    this.setState(newState);
  }
}

// Singleton state store instance
export const store = new StateStore();
