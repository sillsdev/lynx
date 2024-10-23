import { describe, expect, it } from "vitest";
import { AllowedCharacterSet, CharacterRegexWhitelist } from "../../src/rule-set/allowed-character-set";

describe('AllowedCharacterRegexWhitelist tests', () => {

  describe('basic ASCII tests', () => {
    const vowelCharacterSet: AllowedCharacterSet = new CharacterRegexWhitelist(/[aeiouAEIOU]/);

    it('rejects the empty string', () => {
      expect(vowelCharacterSet.isCharacterAllowed('')).toBe(false);
    })

    it('rejects multi-characters strings', () => {
      expect(vowelCharacterSet.isCharacterAllowed('ae')).toBe(false);
    })

    it('returns true for allowed characters', () => {
      expect(vowelCharacterSet.isCharacterAllowed('a')).toBe(true);
      expect(vowelCharacterSet.isCharacterAllowed('O')).toBe(true);
    })

    it('returns false for disallowed characters', () => {
      expect(vowelCharacterSet.isCharacterAllowed('b')).toBe(false);
      expect(vowelCharacterSet.isCharacterAllowed('0')).toBe(false);
    });
  });

  describe('Unicode tests', () => {
    it('functions the same whether Unicode escaped characters are used or not', () => {
      const vowelCharacterSet: AllowedCharacterSet = new CharacterRegexWhitelist(/[aeiouAEIOUŨ]/);
      const escapedVowelCharacterSet: AllowedCharacterSet = new CharacterRegexWhitelist(/[\u0061\u0065\u0069\u006F\u0075\u0041\u0045\u0049\u004F\u0055\u0168]/);

      expect(vowelCharacterSet.isCharacterAllowed('e')).toBe(true);
      expect(vowelCharacterSet.isCharacterAllowed('\u0065')).toBe(true);
      expect(vowelCharacterSet.isCharacterAllowed('I')).toBe(true);
      expect(vowelCharacterSet.isCharacterAllowed('\u0049')).toBe(true);
      expect(vowelCharacterSet.isCharacterAllowed('Ũ')).toBe(true);
      expect(vowelCharacterSet.isCharacterAllowed('\u0168')).toBe(true);
      expect(vowelCharacterSet.isCharacterAllowed('b')).toBe(false);
      expect(vowelCharacterSet.isCharacterAllowed('\u0062')).toBe(false);

      expect(escapedVowelCharacterSet.isCharacterAllowed('e')).toBe(true);
      expect(escapedVowelCharacterSet.isCharacterAllowed('\u0065')).toBe(true);
      expect(escapedVowelCharacterSet.isCharacterAllowed('I')).toBe(true);
      expect(escapedVowelCharacterSet.isCharacterAllowed('\u0049')).toBe(true);
      expect(escapedVowelCharacterSet.isCharacterAllowed('Ũ')).toBe(true);
      expect(escapedVowelCharacterSet.isCharacterAllowed('\u0168')).toBe(true);
      expect(escapedVowelCharacterSet.isCharacterAllowed('b')).toBe(false);
      expect(escapedVowelCharacterSet.isCharacterAllowed('\u0062')).toBe(false);
    });

    it('correctly handles characters outside the basic multilingual plane whether they\'re escaped, explicit, or in a surrogate pair', () => {
      const explicitExtendedUnicodeCharacterSet: AllowedCharacterSet = new CharacterRegexWhitelist(/[😀😁😂😃]/u);
      const escapedExtendedUnicodeCharacterSet: AllowedCharacterSet = new CharacterRegexWhitelist(/[\u{1F600}\u{1F601}\u{1F602}\u{1F603}]/u);
      const surrogatePairExtendedUnicodeCharacterSet: AllowedCharacterSet = new CharacterRegexWhitelist(/[\uD83D\uDE00\uD83D\uDE01\uD83D\uDE02\uD83D\uDE03]/u);

      expect(explicitExtendedUnicodeCharacterSet.isCharacterAllowed('😀')).toBe(true);
      expect(explicitExtendedUnicodeCharacterSet.isCharacterAllowed('\u{1F600}')).toBe(true);
      expect(explicitExtendedUnicodeCharacterSet.isCharacterAllowed('\uD83D\uDE00')).toBe(true);
      expect(explicitExtendedUnicodeCharacterSet.isCharacterAllowed('😲')).toBe(false);
      expect(explicitExtendedUnicodeCharacterSet.isCharacterAllowed('\u{1F632}')).toBe(false);
      expect(explicitExtendedUnicodeCharacterSet.isCharacterAllowed('\uD83D\uDE32')).toBe(false);

      expect(escapedExtendedUnicodeCharacterSet.isCharacterAllowed('😀')).toBe(true);
      expect(escapedExtendedUnicodeCharacterSet.isCharacterAllowed('\u{1F600}')).toBe(true);
      expect(escapedExtendedUnicodeCharacterSet.isCharacterAllowed('\uD83D\uDE00')).toBe(true);
      expect(escapedExtendedUnicodeCharacterSet.isCharacterAllowed('😲')).toBe(false);
      expect(escapedExtendedUnicodeCharacterSet.isCharacterAllowed('\u{1F632}')).toBe(false);
      expect(escapedExtendedUnicodeCharacterSet.isCharacterAllowed('\uD83D\uDE32')).toBe(false);

      expect(surrogatePairExtendedUnicodeCharacterSet.isCharacterAllowed('😀')).toBe(true);
      expect(surrogatePairExtendedUnicodeCharacterSet.isCharacterAllowed('\u{1F600}')).toBe(true);
      expect(surrogatePairExtendedUnicodeCharacterSet.isCharacterAllowed('\uD83D\uDE00')).toBe(true);
      expect(surrogatePairExtendedUnicodeCharacterSet.isCharacterAllowed('😲')).toBe(false);
      expect(surrogatePairExtendedUnicodeCharacterSet.isCharacterAllowed('\u{1F632}')).toBe(false);
      expect(surrogatePairExtendedUnicodeCharacterSet.isCharacterAllowed('\uD83D\uDE32')).toBe(false);
    });
  });
});
