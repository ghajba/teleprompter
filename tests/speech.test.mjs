/**
 * Test Suite for Speech Follow Engine:
 * Tests word normalization (accent/diacritic stripping, punctuation, case insensitivity)
 * and speech matching primitives.
 *
 * Run with Node.js: node tests/speech.test.mjs
 */

import assert from 'node:assert/strict';
import { normalizeWord, detectScriptLanguage, matchTokens, SpeechFollowEngine } from '../js/speech.js';

console.log('🧪 Starting tests for Speech Follow word normalization...');

// Test 1: Hungarian diacritics and accents
assert.equal(normalizeWord('Előadás'), 'eloadas');
assert.equal(normalizeWord('KÖSZÖNTÖM'), 'koszontom');
assert.equal(normalizeWord('gyümölcs'), 'gyumolcs');
assert.equal(normalizeWord('árvíztűrő'), 'arvizturo');
assert.equal(normalizeWord('TÜKÖRFÚRÓGÉP'), 'tukorfurogep');
console.log('✓ Hungarian accent and diacritic normalization verified');

// Test 2: German diacritics, umlauts, and Eszett (ß)
assert.equal(normalizeWord('Große'), 'grosse');
assert.equal(normalizeWord('SCHLIESSEN'), 'schliessen');
assert.equal(normalizeWord('schließen'), 'schliessen');
assert.equal(normalizeWord('Fußgänger'), 'fussganger');
assert.equal(normalizeWord('Überraschung'), 'uberraschung');
assert.equal(normalizeWord('Mädchen'), 'madchen');
assert.equal(normalizeWord('Schöne Grüße'), 'schone grusse');
console.log('✓ German umlauts and Eszett normalization verified');

// Test 3: Punctuation stripping
assert.equal(normalizeWord('Hello, world!'), 'hello world');
assert.equal(normalizeWord('“Idézet”...'), 'idezet');
assert.equal(normalizeWord('Wait--what?'), 'waitwhat');
console.log('✓ Punctuation stripping verified');

// Test 4: Mixed whitespace and empty cases
assert.equal(normalizeWord('   Spaces   '), 'spaces');
assert.equal(normalizeWord(''), '');
assert.equal(normalizeWord(null), '');
assert.equal(normalizeWord(undefined), '');
console.log('✓ Boundary and edge cases verified');

// Test 5: Script language detection (German, Hungarian, English)
assert.equal(
  detectScriptLanguage('Guten Tag und herzlich willkommen zu unserer Präsentation über Teleprompter. Wir haben heute viele Themen.'),
  'de-DE',
  'Should detect German text'
);
assert.equal(
  detectScriptLanguage('Üdvözöljük a teleprompter alkalmazásban, amely zökkenőmentes olvasást biztosít előadásokhoz.'),
  'hu-HU',
  'Should detect Hungarian text'
);
assert.equal(
  detectScriptLanguage('Welcome to the teleprompter application designed for smooth presentation delivery.'),
  'en-US',
  'Should detect English text'
);
console.log('✓ Script language detection verified');

// Test 6: Sliding window speech token alignment algorithm
const script = 'udvozoljuk a teleprompter alkalmazasban amely zokkenomentes olvasast biztosit'
  .split(' ');

// Match first few words
const match1 = matchTokens(['Üdvözöljük', 'a', 'teleprompter'], script, 0);
assert.equal(match1, 2, 'Should match "teleprompter" at index 2');

// Match subsequent phrase even if speaker says filler word ("ööö")
const match2 = matchTokens(['ööö', 'amely', 'zökkenőmentes'], script, match1);
assert.equal(match2, 5, 'Should advance to "zokkenomentes" at index 5');

// German matching test
const germanScript = 'guten tag und herzlich willkommen zu unserer grossen prasentation'
  .split(' ');
const matchDe1 = matchTokens(['Guten', 'Tag'], germanScript, 0);
assert.equal(matchDe1, 1, 'Should match "tag" at index 1');
const matchDe2 = matchTokens(['herzlich', 'willkommen', 'zu', 'unserer', 'großen'], germanScript, matchDe1);
assert.equal(matchDe2, 7, 'Should match "großen" to "grossen" at index 7');
console.log('✓ German speech token alignment verified');
console.log('✓ Fuzzy sliding window alignment verified');

// Test 7: Strict monotonic forward matching with repeating stopwords
const repeatingScript = 'ez a mondat a szovegben es a masik mondat a prompterben'.split(' ');
const rep1 = matchTokens(['ez', 'a', 'mondat'], repeatingScript, 0);
assert.equal(rep1, 2, 'Matches "mondat" at 2');

// Interim repetition event must never jump backwards
const rep2 = matchTokens(['a', 'mondat'], repeatingScript, rep1);
assert.ok(rep2 >= rep1, 'Monotonic forward: index must never jump backwards on interim repeats');

const rep3 = matchTokens(['masik', 'mondat'], repeatingScript, rep1);
assert.ok(rep3 > rep1, 'Advances forward on matching phrase');
console.log('✓ Strict monotonic forward matching and stopword resilience verified');

// Test 8: Stage directions and pause bar exclusion from script indexing
const mockInner = {
  children: [
    {
      classList: { contains: (c) => c === 'prompter-heading' },
      textContent: 'Title Line',
      querySelector: () => null
    },
    {
      classList: { contains: (c) => c === 'prompter-pause-bar' },
      textContent: 'PAUSE / BREAK',
      querySelector: () => null
    },
    {
      classList: { contains: (c) => c === 'prompter-p' },
      textContent: 'Actual spoken sentence [Pause 2s]',
      querySelector: (sel) => (sel === '.prompter-cue' ? {} : null),
      cloneNode: () => ({
        textContent: 'Actual spoken sentence ',
        querySelectorAll: (sel) => (sel === '.prompter-cue' ? [{ remove: () => {} }] : [])
      })
    }
  ]
};

globalThis.document = {
  getElementById: (id) => (id === 'prompterTextInner' ? mockInner : null)
};

const engine = new SpeechFollowEngine();
engine.indexScript();
assert.ok(!engine._scriptTokens.includes('pause'), 'Pause cue must be excluded from spoken tokens');
assert.ok(!engine._scriptTokens.includes('2s'), 'Cue numbers must be excluded from spoken tokens');
assert.ok(engine._scriptTokens.includes('title'), 'Heading words must be indexed');
assert.ok(engine._scriptTokens.includes('spoken'), 'Spoken words must be indexed');
console.log('✓ Stage directions (.prompter-cue) and pause bars (.prompter-pause-bar) excluded from indexing');

console.log('🎉 All Speech Follow Engine tests passed successfully!');
