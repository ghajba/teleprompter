/**
 * Native Voice Follow Engine:
 * Uses browser Web Speech API (SpeechRecognition / webkitSpeechRecognition)
 * to transcribe speaker voice in real-time, align words against the script,
 * and automatically drive teleprompter scroll and reading focus.
 */

import { store } from './state.js';
import { scroller } from './scroller.js';
import { highlightController } from './highlight.js';
import { stripMarkdown } from './markdown.js';

// Check browser support for Web Speech API
const SpeechRecognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition || null)
  : null;

export function isSpeechRecognitionSupported() {
  return Boolean(SpeechRecognition);
}

/**
 * Normalizes text for fuzzy token matching (removes punctuation, accents, lowercase, German ß).
 * @param {string} str
 * @returns {string}
 */
export function normalizeWord(str) {
  return (str || '')
    .toLowerCase()
    .replace(/ß/g, 'ss') // Normalize German Eszett
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics (ä->a, ö->o, ü->u, etc.)
    .replace(/[^\w\s]/g, '') // remove punctuation
    .trim();
}

/**
 * Detects language from script text (German, Hungarian, English).
 * @param {string} text
 * @returns {string} e.g. 'de-DE', 'hu-HU', 'en-US'
 */
export function detectScriptLanguage(text) {
  if (!text) return 'en-US';
  const sample = ` ${text.toLowerCase().replace(/\s+/g, ' ')} `;

  // Distinctive German clues
  const germanClues = [' und ', ' der ', ' die ', ' das ', ' ist ', ' nicht ', ' mit ', ' für ', ' auf ', ' ein ', ' eine ', ' sich ', ' sie ', ' wir ', ' ich ', ' werden ', ' haben ', ' über ', ' oder ', ' aber ', ' wie ', ' wenn ', ' dass ', ' hier ', ' bitte ', ' heute '];
  // Distinctive Hungarian clues
  const hungarianClues = [' hogy ', ' nem ', ' vagy ', ' és ', ' egy ', ' van ', ' volt ', ' meg ', ' kell ', ' ez ', ' az ', ' mint ', ' csak ', ' de ', ' ha ', ' már ', ' sok ', ' miért ', ' köszönöm '];
  // Distinctive English clues
  const englishClues = [' the ', ' and ', ' to ', ' of ', ' in ', ' that ', ' is ', ' you ', ' for ', ' with ', ' on ', ' this ', ' are ', ' from ', ' have ', ' will ', ' with ', ' about ', ' welcome '];

  let germanScore = (sample.match(/[äöüß]/g) || []).length * 2;
  for (const word of germanClues) {
    if (sample.includes(word)) germanScore += 3;
  }

  let hungarianScore = (sample.match(/[áéíóöőúüű]/g) || []).length * 2;
  for (const word of hungarianClues) {
    if (sample.includes(word)) hungarianScore += 3;
  }

  let englishScore = 0;
  for (const word of englishClues) {
    if (sample.includes(word)) englishScore += 3;
  }

  if (germanScore > hungarianScore && germanScore > englishScore && germanScore >= 5) {
    return 'de-DE';
  }
  if (hungarianScore > germanScore && hungarianScore > englishScore && hungarianScore >= 5) {
    return 'hu-HU';
  }
  if (englishScore > germanScore && englishScore > hungarianScore && englishScore >= 5) {
    return 'en-US';
  }

  return (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'en-US';
}

export class SpeechFollowEngine {
  constructor() {
    this._recognition = null;
    this._isListening = false;
    this._scriptTokens = [];
    this._tokenElements = [];
    this._lastMatchedIndex = 0;
    this._status = 'idle'; // 'idle' | 'listening' | 'paused' | 'error' | 'unsupported'
    this._listeners = new Set();
  }

  /**
   * Initializes speech recognition engine and syncs with store.
   */
  init() {
    if (!SpeechRecognition) {
      this._status = 'unsupported';
      this._notifyStatus();
      return;
    }

    // Subscribe to state changes for voice follow
    store.subscribe((state, changedKeys) => {
      if (changedKeys.includes('voiceFollowEnabled')) {
        if (state.voiceFollowEnabled) {
          this.start();
        } else {
          this.stop();
        }
      }
      if (changedKeys.includes('voiceLanguage') && this._isListening) {
        // Restart with new language
        this.stop();
        this.start();
      }
      if (changedKeys.includes('text')) {
        this.indexScript();
      }
    });

    this.indexScript();

    if (store.getState().voiceFollowEnabled) {
      this.start();
    }
  }

  /**
   * Parses the active prompter text and indexes word tokens for fast alignment.
   */
  indexScript() {
    if (typeof document === 'undefined') return;

    const innerEl = document.getElementById('prompterTextInner');
    const rawText = store.getState().text || '';
    const cleanText = stripMarkdown(rawText);

    this._scriptTokens = [];
    this._tokenElements = [];
    this._lastMatchedIndex = 0;

    const words = cleanText.split(/\s+/).filter(Boolean);
    for (let i = 0; i < words.length; i++) {
      this._scriptTokens.push(normalizeWord(words[i]));
    }

    // Map blocks in DOM
    if (innerEl) {
      const blocks = Array.from(innerEl.children).filter(
        (el) => !el.classList.contains('prompter-line-break')
      );
      this._tokenElements = blocks;
    }
  }

  /**
   * Starts listening to microphone.
   */
  start() {
    if (!SpeechRecognition) {
      this._status = 'unsupported';
      this._notifyStatus();
      return;
    }

    if (this._isListening) return;

    try {
      this._recognition = new SpeechRecognition();
      this._recognition.continuous = true;
      this._recognition.interimResults = true;

      // Configure language
      const selectedLang = store.getState().voiceLanguage || 'auto';
      if (selectedLang !== 'auto') {
        this._recognition.lang = selectedLang;
      } else {
        this._recognition.lang = detectScriptLanguage(store.getState().text || '');
      }

      this._recognition.onstart = () => {
        this._isListening = true;
        this._status = 'listening';
        this._notifyStatus();
      };

      this._recognition.onresult = (event) => {
        this._handleResult(event);
      };

      this._recognition.onerror = (event) => {
        console.warn('[VoiceFollow] Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          this._status = 'error';
          store.setState({ voiceFollowEnabled: false });
        }
        this._notifyStatus();
      };

      this._recognition.onend = () => {
        this._isListening = false;
        // Auto-restart if user still has voice follow enabled
        if (store.getState().voiceFollowEnabled) {
          try {
            this._recognition.start();
          } catch {
            this._status = 'paused';
            this._notifyStatus();
          }
        } else {
          this._status = 'idle';
          this._notifyStatus();
        }
      };

      this._recognition.start();
    } catch (err) {
      console.warn('[VoiceFollow] Failed to start speech recognition:', err);
      this._status = 'error';
      this._notifyStatus();
    }
  }

  /**
   * Stops microphone listening.
   */
  stop() {
    this._isListening = false;
    if (this._recognition) {
      try {
        this._recognition.stop();
      } catch {
        // Ignore errors during stop
      }
      this._recognition = null;
    }
    this._status = 'idle';
    this._notifyStatus();
  }

  /**
   * Subscribes a listener to status changes.
   * @param {(status: string) => void} listener
   * @returns {() => void}
   */
  onStatusChange(listener) {
    this._listeners.add(listener);
    listener(this._status);
    return () => this._listeners.delete(listener);
  }

  /**
   * Returns current engine status.
   * @returns {string}
   */
  getStatus() {
    return this._status;
  }

  /**
   * Handles incoming recognition transcript events and matches against script tokens.
   * @param {SpeechRecognitionEvent} event
   * @private
   */
  _handleResult(event) {
    let latestTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      latestTranscript += ' ' + event.results[i][0].transcript;
    }

    const spokenWords = latestTranscript
      .split(/\s+/)
      .map(normalizeWord)
      .filter((w) => w.length > 1);

    if (spokenWords.length === 0 || this._scriptTokens.length === 0) return;

    // Sliding window search around last matched position
    const searchStart = Math.max(0, this._lastMatchedIndex - 5);
    const searchEnd = Math.min(this._scriptTokens.length, this._lastMatchedIndex + 35);

    for (const spokenWord of spokenWords) {
      for (let i = searchStart; i < searchEnd; i++) {
        if (this._scriptTokens[i] === spokenWord) {
          this._lastMatchedIndex = i;
          this._syncScrollToMatchedToken(i);
          break;
        }
      }
    }
  }

  /**
   * Adjusts prompter scroll position and visual focus to the matched token index.
   * @param {number} tokenIndex
   * @private
   */
  _syncScrollToMatchedToken(tokenIndex) {
    if (this._tokenElements.length === 0) return;

    // Approximate target element index based on relative word progress
    const progressFraction = tokenIndex / Math.max(1, this._scriptTokens.length);
    const targetBlockIndex = Math.min(
      this._tokenElements.length - 1,
      Math.floor(progressFraction * this._tokenElements.length)
    );

    const targetEl = this._tokenElements[targetBlockIndex];
    if (targetEl) {
      highlightController.focusElement(targetEl);

      // Auto-scroll so target element aligns with the eyeline guide
      const eyelinePercent = store.getState().eyelinePosition || 35;
      const eyelineY = typeof window !== 'undefined' ? (window.innerHeight * eyelinePercent) / 100 : 280;
      const rect = targetEl.getBoundingClientRect();
      const currentScroll = scroller.getScrollY();

      // Delta needed to align element's center with eyeline
      const deltaY = rect.top - eyelineY + rect.height / 2;
      if (Math.abs(deltaY) > 30) {
        // Smoothly adjust scroll position
        const newY = Math.max(0, currentScroll + deltaY * 0.4);
        scroller.setScrollY(newY);
      }
    }
  }

  /**
   * @private
   */
  _notifyStatus() {
    for (const listener of this._listeners) {
      try {
        listener(this._status);
      } catch (err) {
        console.error('[VoiceFollow] Error in listener:', err);
      }
    }
  }
}

export const speechEngine = new SpeechFollowEngine();
