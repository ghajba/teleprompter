/**
 * Safe localStorage wrapper with error handling and debounced save capabilities.
 * Zero external dependencies.
 */

const STORAGE_PREFIX = 'teleprompter_';

/**
 * Checks if localStorage is available and accessible.
 * @returns {boolean}
 */
export function isStorageAvailable() {
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Saves a serializable value into localStorage.
 * @param {string} key 
 * @param {any} value 
 * @returns {boolean} True if successfully stored
 */
export function saveItem(key, value) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const serialized = JSON.stringify(value);
    window.localStorage.setItem(STORAGE_PREFIX + key, serialized);
    return true;
  } catch (error) {
    console.warn(`[Storage] Failed to save key "${key}":`, error);
    return false;
  }
}

/**
 * Loads a value from localStorage, with fallback if not found or on error.
 * @template T
 * @param {string} key 
 * @param {T} fallbackValue 
 * @returns {T}
 */
export function loadItem(key, fallbackValue) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallbackValue;
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (raw === null || raw === undefined) {
      return fallbackValue;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`[Storage] Failed to load key "${key}", using fallback:`, error);
    return fallbackValue;
  }
}

/**
 * Removes an item from localStorage.
 * @param {string} key 
 */
export function removeItem(key) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_PREFIX + key);
    }
  } catch (error) {
    console.warn(`[Storage] Failed to remove key "${key}":`, error);
  }
}

/**
 * Clears all teleprompter keys from localStorage.
 */
export function clearAll() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const keysToRemove = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      window.localStorage.removeItem(k);
    }
  } catch (error) {
    console.warn('[Storage] Failed to clear items:', error);
  }
}

/**
 * Creates a debounced version of a function.
 * @param {Function} func 
 * @param {number} delayMs 
 * @returns {Function}
 */
export function debounce(func, delayMs = 300) {
  let timeoutId = null;
  return function (...args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func.apply(this, args);
      timeoutId = null;
    }, delayMs);
  };
}
