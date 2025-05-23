import { ScriptureNode, ScriptureText } from '@sillsdev/lynx';
import { describe, expect, it } from 'vitest';

import { CheckableGroup, ScriptureNodeCheckable, TextDocumentCheckable } from '../../src/checkable';
import { PairedPunctuationConfig } from '../../src/paired-punctuation/paired-punctuation-config';
import { PairedPunctuationIterator } from '../../src/paired-punctuation/paired-punctuation-utils';
import { PairedPunctuationDirection } from '../../src/utils';

describe('PairedPunctuationIterator tests', () => {
  describe('Text paired punctuation identification', () => {
    it('does not identify any punctuation marks not in the PairedPunctuationConfig', () => {
      const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();

      const emptyStringPairedPunctuationIterator: PairedPunctuationIterator = testEnv.newPairedPunctuationIterator('');
      expect(emptyStringPairedPunctuationIterator.next()).toEqual({
        done: true,
        value: undefined,
      });

      const noPunctuationPairedPunctuationIterator: PairedPunctuationIterator = testEnv.newPairedPunctuationIterator(
        'The rain in Spain falls mainly on the plain',
      );
      expect(noPunctuationPairedPunctuationIterator.next()).toEqual({
        done: true,
        value: undefined,
      });

      const noPairedPunctuationPairedPunctuationIterator: PairedPunctuationIterator =
        testEnv.newPairedPunctuationIterator('The #rain, in @Spain! falls& mainly? on^ the plain*');
      expect(noPairedPunctuationPairedPunctuationIterator.next()).toEqual({
        done: true,
        value: undefined,
      });

      const pairedPunctuationNotInTheConfigIterator: PairedPunctuationIterator = testEnv.newPairedPunctuationIterator(
        '\u201EThe rain in `Spain` falls <mainly> on the plain\u201F',
      );
      expect(pairedPunctuationNotInTheConfigIterator.next()).toEqual({
        done: true,
        value: undefined,
      });
    });

    it('identifies properly paired punctuation in the context of a sentence', () => {
      const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();

      const pairedPunctuationIterator: PairedPunctuationIterator = testEnv.newPairedPunctuationIterator(
        '\u201CThe rain\u201D in [Spain {falls} mainly] (on the plain).',
      );
      expect(pairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Opening,
          startIndex: 0,
          endIndex: 1,
          text: '\u201C',
        },
      });
      expect(pairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Closing,
          startIndex: 9,
          endIndex: 10,
          text: '\u201D',
        },
      });
      expect(pairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Opening,
          startIndex: 14,
          endIndex: 15,
          text: '[',
        },
      });
      expect(pairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Opening,
          startIndex: 21,
          endIndex: 22,
          text: '{',
        },
      });
      expect(pairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Closing,
          startIndex: 27,
          endIndex: 28,
          text: '}',
        },
      });
      expect(pairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Closing,
          startIndex: 35,
          endIndex: 36,
          text: ']',
        },
      });
      expect(pairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Opening,
          startIndex: 37,
          endIndex: 38,
          text: '(',
        },
      });
      expect(pairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Closing,
          startIndex: 50,
          endIndex: 51,
          text: ')',
        },
      });
      expect(pairedPunctuationIterator.next()).toEqual({
        done: true,
        value: undefined,
      });
    });

    it('identifies malformed paired punctuation in the context of a sentence', () => {
      const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();

      const pairedPunctuationIterator: PairedPunctuationIterator = testEnv.newPairedPunctuationIterator(
        '\u201DThe rain\u201C in [Spain [falls{ mainly) (on the plain].',
      );
      expect(pairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Closing,
          startIndex: 0,
          endIndex: 1,
          text: '\u201D',
        },
      });
      expect(pairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Opening,
          startIndex: 9,
          endIndex: 10,
          text: '\u201C',
        },
      });
      expect(pairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Opening,
          startIndex: 14,
          endIndex: 15,
          text: '[',
        },
      });
      expect(pairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Opening,
          startIndex: 21,
          endIndex: 22,
          text: '[',
        },
      });
      expect(pairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Opening,
          startIndex: 27,
          endIndex: 28,
          text: '{',
        },
      });
      expect(pairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Closing,
          startIndex: 35,
          endIndex: 36,
          text: ')',
        },
      });
      expect(pairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Opening,
          startIndex: 37,
          endIndex: 38,
          text: '(',
        },
      });
      expect(pairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Closing,
          startIndex: 50,
          endIndex: 51,
          text: ']',
        },
      });
      expect(pairedPunctuationIterator.next()).toEqual({
        done: true,
        value: undefined,
      });
    });

    it('adheres to the PairedPunctuationConfig', () => {
      const backwardsTestEnv: TestEnvironment = TestEnvironment.createWithBackwardsPairedPunctuation();

      const pairedPunctuationIterator: PairedPunctuationIterator = backwardsTestEnv.newPairedPunctuationIterator(
        '\u201CThe rain\u201D in [Spain {falls} mainly] (on the plain).',
      );
      expect(pairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Closing,
          startIndex: 0,
          endIndex: 1,
          text: '\u201C',
        },
      });
      expect(pairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Opening,
          startIndex: 9,
          endIndex: 10,
          text: '\u201D',
        },
      });
      expect(pairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Closing,
          startIndex: 14,
          endIndex: 15,
          text: '[',
        },
      });
      expect(pairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Closing,
          startIndex: 21,
          endIndex: 22,
          text: '{',
        },
      });
      expect(pairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Opening,
          startIndex: 27,
          endIndex: 28,
          text: '}',
        },
      });
      expect(pairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Opening,
          startIndex: 35,
          endIndex: 36,
          text: ']',
        },
      });
      expect(pairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Closing,
          startIndex: 37,
          endIndex: 38,
          text: '(',
        },
      });
      expect(pairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Opening,
          startIndex: 50,
          endIndex: 51,
          text: ')',
        },
      });
      expect(pairedPunctuationIterator.next()).toEqual({
        done: true,
        value: undefined,
      });

      const bizarreTestEnv: TestEnvironment = TestEnvironment.createWithBizarrePairedPunctuation();

      const bizarrePairedPunctuationIterator: PairedPunctuationIterator = bizarreTestEnv.newPairedPunctuationIterator(
        'The +rain in /Spain +falls- mainly\\ on the- plain.',
      );
      expect(bizarrePairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Opening,
          startIndex: 4,
          endIndex: 5,
          text: '+',
        },
      });
      expect(bizarrePairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Opening,
          startIndex: 13,
          endIndex: 14,
          text: '/',
        },
      });
      expect(bizarrePairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Opening,
          startIndex: 20,
          endIndex: 21,
          text: '+',
        },
      });
      expect(bizarrePairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Closing,
          startIndex: 26,
          endIndex: 27,
          text: '-',
        },
      });
      expect(bizarrePairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Closing,
          startIndex: 34,
          endIndex: 35,
          text: '\\',
        },
      });
      expect(bizarrePairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          direction: PairedPunctuationDirection.Closing,
          startIndex: 42,
          endIndex: 43,
          text: '-',
        },
      });
      expect(bizarrePairedPunctuationIterator.next()).toEqual({
        done: true,
        value: undefined,
      });
    });
  });

  describe('ScriptureNode paired punctuation identification', () => {
    it('identifies paired punctuation in a single ScriptureNode', () => {
      const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();
      const scriptureNode: ScriptureNode = testEnv.createScriptureNode('text (with) parentheses', 1, 5, 1, 28);

      const pairedPunctuationIterator: PairedPunctuationIterator = testEnv.newPairedPunctuationIterator([
        scriptureNode,
      ]);
      expect(pairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          startIndex: 5,
          endIndex: 6,
          enclosingRange: scriptureNode.range,
          text: '(',
          direction: PairedPunctuationDirection.Opening,
        },
      });
      expect(pairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          startIndex: 10,
          endIndex: 11,
          enclosingRange: scriptureNode.range,
          text: ')',
          direction: PairedPunctuationDirection.Closing,
        },
      });
      expect(pairedPunctuationIterator.next()).toEqual({
        done: true,
        value: undefined,
      });
    });

    it('identifies paired punctuation in multiple ScriptureNodes', () => {
      const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();
      const scriptureNode1: ScriptureNode = testEnv.createScriptureNode('text (with [brackets', 1, 5, 1, 23);
      const scriptureNode2: ScriptureNode = testEnv.createScriptureNode('different] text)', 2, 3, 2, 19);

      const pairedPunctuationIterator: PairedPunctuationIterator = testEnv.newPairedPunctuationIterator([
        scriptureNode1,
        scriptureNode2,
      ]);
      expect(pairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          startIndex: 5,
          endIndex: 6,
          enclosingRange: scriptureNode1.range,
          text: '(',
          direction: PairedPunctuationDirection.Opening,
        },
      });
      expect(pairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          startIndex: 11,
          endIndex: 12,
          enclosingRange: scriptureNode1.range,
          text: '[',
          direction: PairedPunctuationDirection.Opening,
        },
      });
      expect(pairedPunctuationIterator.next()).toEqual({
        done: false,
        value: {
          startIndex: 9,
          endIndex: 10,
          enclosingRange: scriptureNode2.range,
          text: ']',
          direction: PairedPunctuationDirection.Closing,
        },
      });
      expect(pairedPunctuationIterator.next()).toStrictEqual({
        done: false,
        value: {
          startIndex: 15,
          endIndex: 16,
          enclosingRange: scriptureNode2.range,
          text: ')',
          direction: PairedPunctuationDirection.Closing,
        },
      });
      expect(pairedPunctuationIterator.next()).toEqual({
        done: true,
        value: undefined,
      });
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

  newPairedPunctuationIterator(text: string | ScriptureNode[]): PairedPunctuationIterator {
    if (typeof text === 'string') {
      return new PairedPunctuationIterator(
        this.pairedPunctuationConfig,
        new CheckableGroup([new TextDocumentCheckable(text)]),
      );
    }
    return new PairedPunctuationIterator(
      this.pairedPunctuationConfig,
      new CheckableGroup(text.map((x) => new ScriptureNodeCheckable(x))),
    );
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
