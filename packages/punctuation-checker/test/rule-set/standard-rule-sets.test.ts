import { describe, expect, it } from "vitest";
import { StandardRuleSets } from "../../src/rule-set/standard-rule-sets";

describe('Standard English rule set tests', () => {
  describe('Basic ASCII tests', () => {
    const standardEnglishCharacterSet = StandardRuleSets.English;
    const allowedCharacterSet = standardEnglishCharacterSet._getAllowedCharacterSet();
    
    it('rejects the empty string', () => {
      expect(allowedCharacterSet.isCharacterAllowed('')).toBe(false);
    });

    it('rejects multi-character strings', () => {
      expect(allowedCharacterSet.isCharacterAllowed('ab')).toBe(false);
      expect(allowedCharacterSet.isCharacterAllowed('. ')).toBe(false);
    });

    it('accepts standard English characters', () => {
      expect(allowedCharacterSet.isCharacterAllowed('a')).toBe(true);
      expect(allowedCharacterSet.isCharacterAllowed('t')).toBe(true);
      expect(allowedCharacterSet.isCharacterAllowed('z')).toBe(true);
      expect(allowedCharacterSet.isCharacterAllowed('A')).toBe(true);
      expect(allowedCharacterSet.isCharacterAllowed('F')).toBe(true);
      expect(allowedCharacterSet.isCharacterAllowed('Z')).toBe(true);
      expect(allowedCharacterSet.isCharacterAllowed('?')).toBe(true);
      expect(allowedCharacterSet.isCharacterAllowed(';')).toBe(true);
      expect(allowedCharacterSet.isCharacterAllowed('(')).toBe(true);
      expect(allowedCharacterSet.isCharacterAllowed('\u201C')).toBe(true);
      expect(allowedCharacterSet.isCharacterAllowed('\u2019')).toBe(true);
      expect(allowedCharacterSet.isCharacterAllowed(' ')).toBe(true);
      expect(allowedCharacterSet.isCharacterAllowed('\r')).toBe(true);
      expect(allowedCharacterSet.isCharacterAllowed('\t')).toBe(true);
      expect(allowedCharacterSet.isCharacterAllowed('\n')).toBe(true);
    });

    it('rejects non-standard (in the Bible translation setting) English characters', () => {
      expect(allowedCharacterSet.isCharacterAllowed('{')).toBe(false);
      expect(allowedCharacterSet.isCharacterAllowed('%')).toBe(false);
      expect(allowedCharacterSet.isCharacterAllowed('`')).toBe(false);
      expect(allowedCharacterSet.isCharacterAllowed('@')).toBe(false);
      expect(allowedCharacterSet.isCharacterAllowed('_')).toBe(false);
      expect(allowedCharacterSet.isCharacterAllowed('\u201F')).toBe(false);
      expect(allowedCharacterSet.isCharacterAllowed('\u00A0')).toBe(false);
      expect(allowedCharacterSet.isCharacterAllowed('🙓')).toBe(false);
    });
  });
});