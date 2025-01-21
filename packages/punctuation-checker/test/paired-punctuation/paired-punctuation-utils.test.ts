import { ScriptureNode, ScriptureText } from '@sillsdev/lynx';
import { describe, expect, it } from 'vitest';

import { PairedPunctuationConfig } from '../../src/paired-punctuation/paired-punctuation-config';
import { PairedPunctuationIterator } from '../../src/paired-punctuation/paired-punctuation-utils';
import { PairedPunctuationDirection, ScriptureNodeGroup } from '../../src/utils';

describe('PairedPunctuationIterator tests', () => {
  describe('Text paired punctuation identification', () => {
    it('does not identify any punctuation marks not in the PairedPunctuationConfig', () => {
      const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();

      const emptyStringPairedPunctuationIterator: PairedPunctuationIterator = testEnv.newPairedPunctuationIterator('');
      expect(emptyStringPairedPunctuationIterator.hasNext()).toBe(false);

      const noPunctuationPairedPunctuationIterator: PairedPunctuationIterator = testEnv.newPairedPunctuationIterator(
        'The rain in Spain falls mainly on the plain',
      );
      expect(noPunctuationPairedPunctuationIterator.hasNext()).toBe(false);

      const noPairedPunctuationPairedPunctuationIterator: PairedPunctuationIterator =
        testEnv.newPairedPunctuationIterator('The #rain, in @Spain! falls& mainly? on^ the plain*');
      expect(noPairedPunctuationPairedPunctuationIterator.hasNext()).toBe(false);

      const pairedPunctuationNotInTheConfigIterator: PairedPunctuationIterator = testEnv.newPairedPunctuationIterator(
        '\u201EThe rain in `Spain` falls <mainly> on the plain\u201F',
      );
      expect(pairedPunctuationNotInTheConfigIterator.hasNext()).toBe(false);
    });

    it('identifies properly paired punctuation in the context of a sentence', () => {
      const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();

      const pairedPunctuationIterator: PairedPunctuationIterator = testEnv.newPairedPunctuationIterator(
        '\u201CThe rain\u201D in [Spain {falls} mainly] (on the plain).',
      );
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Opening,
        startIndex: 0,
        endIndex: 1,
        text: '\u201C',
      });
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Closing,
        startIndex: 9,
        endIndex: 10,
        text: '\u201D',
      });
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Opening,
        startIndex: 14,
        endIndex: 15,
        text: '[',
      });
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Opening,
        startIndex: 21,
        endIndex: 22,
        text: '{',
      });
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Closing,
        startIndex: 27,
        endIndex: 28,
        text: '}',
      });
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Closing,
        startIndex: 35,
        endIndex: 36,
        text: ']',
      });
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Opening,
        startIndex: 37,
        endIndex: 38,
        text: '(',
      });
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Closing,
        startIndex: 50,
        endIndex: 51,
        text: ')',
      });
    });

    it('identifies malformed paired punctuation in the context of a sentence', () => {
      const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();

      const pairedPunctuationIterator: PairedPunctuationIterator = testEnv.newPairedPunctuationIterator(
        '\u201DThe rain\u201C in [Spain [falls{ mainly) (on the plain].',
      );
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Closing,
        startIndex: 0,
        endIndex: 1,
        text: '\u201D',
      });
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Opening,
        startIndex: 9,
        endIndex: 10,
        text: '\u201C',
      });
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Opening,
        startIndex: 14,
        endIndex: 15,
        text: '[',
      });
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Opening,
        startIndex: 21,
        endIndex: 22,
        text: '[',
      });
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Opening,
        startIndex: 27,
        endIndex: 28,
        text: '{',
      });
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Closing,
        startIndex: 35,
        endIndex: 36,
        text: ')',
      });
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Opening,
        startIndex: 37,
        endIndex: 38,
        text: '(',
      });
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Closing,
        startIndex: 50,
        endIndex: 51,
        text: ']',
      });
    });

    it('adheres to the PairedPunctuationConfig', () => {
      const backwardsTestEnv: TestEnvironment = TestEnvironment.createWithBackwardsPairedPunctuation();

      const pairedPunctuationIterator: PairedPunctuationIterator = backwardsTestEnv.newPairedPunctuationIterator(
        '\u201CThe rain\u201D in [Spain {falls} mainly] (on the plain).',
      );
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Closing,
        startIndex: 0,
        endIndex: 1,
        text: '\u201C',
      });
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Opening,
        startIndex: 9,
        endIndex: 10,
        text: '\u201D',
      });
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Closing,
        startIndex: 14,
        endIndex: 15,
        text: '[',
      });
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Closing,
        startIndex: 21,
        endIndex: 22,
        text: '{',
      });
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Opening,
        startIndex: 27,
        endIndex: 28,
        text: '}',
      });
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Opening,
        startIndex: 35,
        endIndex: 36,
        text: ']',
      });
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Closing,
        startIndex: 37,
        endIndex: 38,
        text: '(',
      });
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Opening,
        startIndex: 50,
        endIndex: 51,
        text: ')',
      });

      const bizarreTestEnv: TestEnvironment = TestEnvironment.createWithBizarrePairedPunctuation();

      const bizarrePairedPunctuationIterator: PairedPunctuationIterator = bizarreTestEnv.newPairedPunctuationIterator(
        'The +rain in /Spain +falls- mainly\\ on the- plain.',
      );
      expect(bizarrePairedPunctuationIterator.hasNext()).toBe(true);
      expect(bizarrePairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Opening,
        startIndex: 4,
        endIndex: 5,
        text: '+',
      });
      expect(bizarrePairedPunctuationIterator.hasNext()).toBe(true);
      expect(bizarrePairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Opening,
        startIndex: 13,
        endIndex: 14,
        text: '/',
      });
      expect(bizarrePairedPunctuationIterator.hasNext()).toBe(true);
      expect(bizarrePairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Opening,
        startIndex: 20,
        endIndex: 21,
        text: '+',
      });
      expect(bizarrePairedPunctuationIterator.hasNext()).toBe(true);
      expect(bizarrePairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Closing,
        startIndex: 26,
        endIndex: 27,
        text: '-',
      });
      expect(bizarrePairedPunctuationIterator.hasNext()).toBe(true);
      expect(bizarrePairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Closing,
        startIndex: 34,
        endIndex: 35,
        text: '\\',
      });
      expect(bizarrePairedPunctuationIterator.hasNext()).toBe(true);
      expect(bizarrePairedPunctuationIterator.next()).toEqual({
        direction: PairedPunctuationDirection.Closing,
        startIndex: 42,
        endIndex: 43,
        text: '-',
      });
    });
  });

  describe('ScriptureNode paired punctuation identification', () => {
    it('identifies paired punctuation in a single ScriptureNode', () => {
      const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();
      const scriptureNode: ScriptureNode = testEnv.createScriptureNode('text (with) parentheses', 1, 5, 1, 28);

      const pairedPunctuationIterator: PairedPunctuationIterator = testEnv.newPairedPunctuationIterator(
        ScriptureNodeGroup.createFromNodes([scriptureNode]),
      );
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toEqual({
        startIndex: 5,
        endIndex: 6,
        enclosingRange: scriptureNode.range,
        text: '(',
        direction: PairedPunctuationDirection.Opening,
      });
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toEqual({
        startIndex: 10,
        endIndex: 11,
        enclosingRange: scriptureNode.range,
        text: ')',
        direction: PairedPunctuationDirection.Closing,
      });
      expect(pairedPunctuationIterator.hasNext()).toBe(false);
    });

    it('identifies paired punctuation in multiple ScriptureNodes', () => {
      const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();
      const scriptureNode1: ScriptureNode = testEnv.createScriptureNode('text (with [brackets', 1, 5, 1, 23);
      const scriptureNode2: ScriptureNode = testEnv.createScriptureNode('different] text)', 2, 3, 2, 19);

      const pairedPunctuationIterator: PairedPunctuationIterator = testEnv.newPairedPunctuationIterator(
        ScriptureNodeGroup.createFromNodes([scriptureNode1, scriptureNode2]),
      );
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toEqual({
        startIndex: 5,
        endIndex: 6,
        enclosingRange: scriptureNode1.range,
        text: '(',
        direction: PairedPunctuationDirection.Opening,
      });
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toEqual({
        startIndex: 11,
        endIndex: 12,
        enclosingRange: scriptureNode1.range,
        text: '[',
        direction: PairedPunctuationDirection.Opening,
      });
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toEqual({
        startIndex: 9,
        endIndex: 10,
        enclosingRange: scriptureNode2.range,
        text: ']',
        direction: PairedPunctuationDirection.Closing,
      });
      expect(pairedPunctuationIterator.hasNext()).toBe(true);
      expect(pairedPunctuationIterator.next()).toStrictEqual({
        startIndex: 15,
        endIndex: 16,
        enclosingRange: scriptureNode2.range,
        text: ')',
        direction: PairedPunctuationDirection.Closing,
      });
      expect(pairedPunctuationIterator.hasNext()).toBe(false);
    });
  });
});

class TestEnvironment {
  constructor(private readonly pairedPunctuationConfig: PairedPunctuationConfig) {}

  static createWithStandardPairedPunctuationAndAngleBrackets(): TestEnvironment {
    return new TestEnvironment(
      new PairedPunctuationConfig.Builder()
        .addQuotationRule({
          openingPunctuationMark: '\u201C',
          closingPunctuationMark: '\u201D',
        })
        .addQuotationRule({
          openingPunctuationMark: '\u2018',
          closingPunctuationMark: '\u2019',
        })
        .addRule({
          openingPunctuationMark: '(',
          closingPunctuationMark: ')',
        })
        .addRule({
          openingPunctuationMark: '[',
          closingPunctuationMark: ']',
        })
        .addRule({
          openingPunctuationMark: '{',
          closingPunctuationMark: '}',
        })
        .addRule({
          openingPunctuationMark: '<',
          closingPunctuationMark: '>',
        })
        .build(),
    );
  }

  static createWithStandardPairedPunctuation(): TestEnvironment {
    return new TestEnvironment(
      new PairedPunctuationConfig.Builder()
        .addQuotationRule({
          openingPunctuationMark: '\u201C',
          closingPunctuationMark: '\u201D',
        })
        .addQuotationRule({
          openingPunctuationMark: '\u2018',
          closingPunctuationMark: '\u2019',
        })
        .addRule({
          openingPunctuationMark: '(',
          closingPunctuationMark: ')',
        })
        .addRule({
          openingPunctuationMark: '[',
          closingPunctuationMark: ']',
        })
        .addRule({
          openingPunctuationMark: '{',
          closingPunctuationMark: '}',
        })
        .build(),
    );
  }

  static createWithBackwardsPairedPunctuation(): TestEnvironment {
    return new TestEnvironment(
      new PairedPunctuationConfig.Builder()
        .addQuotationRule({
          openingPunctuationMark: '\u201D',
          closingPunctuationMark: '\u201C',
        })
        .addQuotationRule({
          openingPunctuationMark: '\u2019',
          closingPunctuationMark: '\u2018',
        })
        .addRule({
          openingPunctuationMark: ')',
          closingPunctuationMark: '(',
        })
        .addRule({
          openingPunctuationMark: ']',
          closingPunctuationMark: '[',
        })
        .addRule({
          openingPunctuationMark: '}',
          closingPunctuationMark: '{',
        })
        .build(),
    );
  }

  static createWithBizarrePairedPunctuation(): TestEnvironment {
    return new TestEnvironment(
      new PairedPunctuationConfig.Builder()
        .addRule({
          openingPunctuationMark: '+',
          closingPunctuationMark: '-',
        })
        .addRule({
          openingPunctuationMark: '/',
          closingPunctuationMark: '\\',
        })
        .build(),
    );
  }

  newPairedPunctuationIterator(text: string | ScriptureNodeGroup): PairedPunctuationIterator {
    return new PairedPunctuationIterator(this.pairedPunctuationConfig, text);
  }

  createScriptureNode(
    text: string,
    lineStart: number,
    characterStart: number,
    lineEnd: number,
    characterEnd: number,
  ): ScriptureNode {
    return new ScriptureText(text, {
      start: {
        line: lineStart,
        character: characterStart,
      },
      end: {
        line: lineEnd,
        character: characterEnd,
      },
    });
  }
}
