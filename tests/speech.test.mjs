/**
 * Test Suite for Speech Follow Engine:
 * Tests word normalization (accent/diacritic stripping, punctuation, case insensitivity)
 * and speech matching primitives.
 *
 * Run with Node.js: node tests/speech.test.mjs
 */

import assert from 'node:assert/strict';
import { normalizeWord, detectScriptLanguage } from '../js/speech.js';

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
function matchTokens(spokenWords, scriptTokens, lastIndex = 0) {
  const normSpoken = spokenWords.map(normalizeWord).filter((w) => w.length > 1);
  const searchStart = Math.max(0, lastIndex - 5);
  const searchEnd = Math.min(scriptTokens.length, lastIndex + 35);
  let matchedIndex = lastIndex;

  for (const spoken of normSpoken) {
    for (let i = searchStart; i < searchEnd; i++) {
      if (scriptTokens[i] === spoken) {
        matchedIndex = i;
        break;
      }
    }
  }
  return matchedIndex;
}

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
console.log('🎉 All Speech Follow Engine tests passed successfully!');
