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

// High-frequency stopwords in Hungarian, German, and English
const STOPWORDS = new Set([
  'a', 'az', 'es', 'hogy', 'nem', 'de', 'is', 'meg', 'ha', 'mint', 'egy', 'van', 'volt', 'mar',
  'der', 'die', 'das', 'und', 'ist', 'mit', 'in', 'im', 'fur', 'von', 'zu', 'ein', 'eine', 'sie',
  'the', 'and', 'to', 'of', 'in', 'is', 'that', 'it', 'for', 'on', 'with', 'as', 'at', 'by'
]);

/**
 * Monotonically matches spoken words forward against script tokens.
 * Uses 2-word sequence matching and stopword gating to prevent erratic jumping.
 * @param {string[]} spokenWords 
 * @param {string[]} scriptTokens 
 * @param {number} [lastIndex=0] 
 * @returns {number}
 */
export function matchTokens(spokenWords, scriptTokens, lastIndex = 0) {
  const normSpoken = spokenWords.map(normalizeWord).filter((w) => w.length > 0);
  if (normSpoken.length === 0 || scriptTokens.length === 0) return lastIndex;

  const searchStart = lastIndex;
  const searchEnd = Math.min(scriptTokens.length, lastIndex + 30);
  let bestMatch = lastIndex;

  // 1. Check two-word sequences (highest confidence)
  if (normSpoken.length >= 2) {
    for (let s = 0; s < normSpoken.length - 1; s++) {
      const w1 = normSpoken[s];
      const w2 = normSpoken[s + 1];
      for (let i = searchStart; i < searchEnd - 1; i++) {
        if (scriptTokens[i] === w1 && scriptTokens[i + 1] === w2) {
          bestMatch = Math.max(bestMatch, i + 1);
        }
      }
    }
  }

  // 2. Single-token fallback if no multi-word sequence advanced
  if (bestMatch === lastIndex) {
    for (let s = normSpoken.length - 1; s >= 0; s--) {
      const word = normSpoken[s];
      const isStop = STOPWORDS.has(word);
      for (let i = searchStart; i < searchEnd; i++) {
        if (scriptTokens[i] === word) {
          if (!isStop || i <= searchStart + 4) {
            bestMatch = Math.max(bestMatch, i);
            break;
          }
        }
      }
      if (bestMatch > lastIndex) break;
    }
  }

  return bestMatch;
}

export class SpeechFollowEngine {
  constructor() {
    this._recognition = null;
    this._isListening = false;
    this._scriptTokens = [];
    this._tokenMap = [];
    this._lastMatchedIndex = 0;
    this._status = 'idle'; // 'idle' | 'ready' | 'listening' | 'paused' | 'error' | 'unsupported'
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

    // Subscribe to state changes
    store.subscribe((state, changedKeys) => {
      if (
        changedKeys.includes('voiceFollowEnabled') ||
        changedKeys.includes('isPlaying') ||
        changedKeys.includes('isCountingDown') ||
        changedKeys.includes('voiceFollowMode')
      ) {
        this._syncPlaybackState();
      }

      if (changedKeys.includes('voiceLanguage') && this._isListening) {
        this.stop();
        this._syncPlaybackState();
      }

      if (changedKeys.includes('text') || changedKeys.includes('renderMarkdown')) {
        this.indexScript();
      }
    });

    this.indexScript();
    this._syncPlaybackState();
  }

  /**
   * Synchronizes microphone lifecycle with prompter playback status.
   * Strictly listens only when Voice Follow is enabled AND playback is active.
   * @private
   */
  _syncPlaybackState() {
    const { voiceFollowEnabled, isPlaying, isCountingDown } = store.getState();
    const shouldListen = Boolean(voiceFollowEnabled && isPlaying && !isCountingDown);

    if (shouldListen) {
      if (!this._isListening) {
        this.start();
      }
    } else {
      if (this._isListening) {
        this.stop();
      } else {
        this._status = voiceFollowEnabled ? 'ready' : 'idle';
        this._notifyStatus();
      }
      if (typeof scroller !== 'undefined' && scroller.setVoiceSpeedMultiplier) {
        scroller.setVoiceSpeedMultiplier(1);
      }
    }
  }

  /**
   * Resets reading progress counter back to start.
   */
  resetProgress() {
    this._lastMatchedIndex = 0;
    if (typeof scroller !== 'undefined') {
      if (scroller.clearVoiceTarget) scroller.clearVoiceTarget();
      if (scroller.setVoiceSpeedMultiplier) scroller.setVoiceSpeedMultiplier(1);
    }
  }

  /**
   * Parses active prompter DOM blocks and indexes word tokens.
   * Strips stage direction cues (.prompter-cue) and pause bars (.prompter-pause-bar).
   */
  indexScript() {
    if (typeof document === 'undefined') return;

    const innerEl = document.getElementById('prompterTextInner');
    this._scriptTokens = [];
    this._tokenMap = [];
    this._lastMatchedIndex = 0;

    if (!innerEl) return;

    const blocks = Array.from(innerEl.children).filter(
      (el) => !el.classList.contains('prompter-line-break')
    );

    for (let blockIdx = 0; blockIdx < blocks.length; blockIdx++) {
      const blockEl = blocks[blockIdx];

      // Exclude scene break / pause bars
      if (blockEl.classList.contains('prompter-pause-bar')) {
        continue;
      }

      // Clone element to safely remove stage directions without altering live DOM
      let textContent = '';
      if (blockEl.querySelector && blockEl.querySelector('.prompter-cue')) {
        const clone = blockEl.cloneNode(true);
        clone.querySelectorAll('.prompter-cue').forEach((cue) => cue.remove());
        textContent = clone.textContent || '';
      } else {
        textContent = blockEl.textContent || '';
      }

      const words = textContent.split(/\s+/).filter(Boolean);
      for (let w = 0; w < words.length; w++) {
        const norm = normalizeWord(words[w]);
        if (norm.length > 0) {
          this._scriptTokens.push(norm);
          this._tokenMap.push({
            word: norm,
            element: blockEl,
            blockIndex: blockIdx
          });
        }
      }
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
        } else if (event.error !== 'no-speech') {
          this._status = 'error';
        }
        this._notifyStatus();
      };

      this._recognition.onend = () => {
        this._isListening = false;
        const { voiceFollowEnabled, isPlaying, isCountingDown } = store.getState();
        if (voiceFollowEnabled && isPlaying && !isCountingDown) {
          try {
            this._recognition.start();
          } catch {
            this._status = 'paused';
            this._notifyStatus();
          }
        } else {
          this._status = voiceFollowEnabled ? 'ready' : 'idle';
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
        // Ignore stop errors
      }
      this._recognition = null;
    }
    const { voiceFollowEnabled } = store.getState();
    this._status = voiceFollowEnabled ? 'ready' : 'idle';
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
   * Uses monotonic forward matching and sequence pairing to eliminate jitter.
   * @param {SpeechRecognitionEvent} event
   * @private
   */
  _handleResult(event) {
    let latestTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      latestTranscript += ' ' + event.results[i][0].transcript;
    }

    const spokenTokens = latestTranscript
      .split(/\s+/)
      .map(normalizeWord)
      .filter((w) => w.length > 0);

    if (spokenTokens.length === 0 || this._scriptTokens.length === 0) return;

    const matchedIndex = matchTokens(spokenTokens, this._scriptTokens, this._lastMatchedIndex);

    // Strictly monotonic: only advance forward
    if (matchedIndex > this._lastMatchedIndex || (matchedIndex === 0 && this._lastMatchedIndex === 0)) {
      this._lastMatchedIndex = matchedIndex;
      this._syncScrollToMatchedToken(matchedIndex);
    }
  }

  /**
   * Adjusts prompter scroll position and visual focus to the matched token index.
   * @param {number} tokenIndex
   * @private
   */
  _syncScrollToMatchedToken(tokenIndex) {
    if (!this._tokenMap || tokenIndex >= this._tokenMap.length) return;
    const tokenInfo = this._tokenMap[tokenIndex];
    if (!tokenInfo || !tokenInfo.element) return;

    const targetEl = tokenInfo.element;

    // 1. Focus active element in reading highlight
    highlightController.focusElement(targetEl);

    // 2. Adjust scrolling
    if (typeof window === 'undefined') return;
    const eyelinePercent = store.getState().eyelinePosition || 35;
    const eyelineY = (window.innerHeight * eyelinePercent) / 100;
    const rect = targetEl.getBoundingClientRect();
    const currentScroll = scroller.getScrollY();

    // Target vertical position: align top of block comfortably near the eyeline
    const elementTargetY = rect.top + Math.min(rect.height * 0.35, 40);
    const deltaY = elementTargetY - eyelineY;

    const mode = store.getState().voiceFollowMode || 'voice-driven';

    if (mode === 'voice-driven') {
      // Pure Voice Scroll: set target scroll position for 60+ FPS easing
      const newTarget = Math.max(0, currentScroll + deltaY);
      scroller.setVoiceTarget(newTarget);
    } else if (mode === 'assisted') {
      // Assisted Pace: modulate scroll speed
      if (deltaY > 40) {
        scroller.setVoiceSpeedMultiplier(1.25);
      } else if (deltaY < -40) {
        scroller.setVoiceSpeedMultiplier(0.7);
      } else {
        scroller.setVoiceSpeedMultiplier(1.0);
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
