import { describe, expect, it } from 'vitest';

import { OverlappingPairs, PairedPunctuationAnalyzer } from '../../src/paired-punctuation/paired-punctuation-analyzer';
import { PairedPunctuationConfig } from '../../src/paired-punctuation/paired-punctuation-config';
import { PairedPunctuationIterator } from '../../src/paired-punctuation/paired-punctuation-utils';
import { _privateTestingClasses } from '../../src/quotation/quotation-analyzer';
import { PairedPunctuationDirection } from '../../src/utils';

describe('PairedPunctuationAnalyzer tests', () => {
  it('identifies no issues with well-formed text', () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();

    const emptyAnalysis = testEnv.pairedPunctuationAnalyzer.analyze('');
    expect(emptyAnalysis.getOverlappingPunctuationMarks()).toEqual([]);
    expect(emptyAnalysis.getUnmatchedPunctuationMarks()).toEqual([]);

    const quotesAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(
      '\u201CThe rain in \u2018Spain \u201Cfalls\u201D mainly\u2019 on the plain.\u201D',
    );
    expect(quotesAnalysis.getOverlappingPunctuationMarks()).toEqual([]);
    expect(quotesAnalysis.getUnmatchedPunctuationMarks()).toEqual([]);

    const multiplePairsAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(
      '(The rain) in [Spain] falls {mainly} (on the plain).',
    );
    expect(multiplePairsAnalysis.getOverlappingPunctuationMarks()).toEqual([]);
    expect(multiplePairsAnalysis.getUnmatchedPunctuationMarks()).toEqual([]);

    const multipleNestedPairsAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(
      '(The rain in [Spain {falls} mainly] on the plain).',
    );
    expect(multipleNestedPairsAnalysis.getOverlappingPunctuationMarks()).toEqual([]);
    expect(multipleNestedPairsAnalysis.getUnmatchedPunctuationMarks()).toEqual([]);

    const quotesAndOtherPairsAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(
      '\u201CThe rain in (Spain \u2018falls [mainly]\u2019 on the plain).\u201D',
    );
    expect(quotesAndOtherPairsAnalysis.getOverlappingPunctuationMarks()).toEqual([]);
    expect(quotesAndOtherPairsAnalysis.getUnmatchedPunctuationMarks()).toEqual([]);
  });

  it('identifies unmatched punctuation pairs', () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();

    const openingParenAnalysis = testEnv.pairedPunctuationAnalyzer.analyze('(');
    expect(openingParenAnalysis.getUnmatchedPunctuationMarks()).toEqual([
      {
        direction: PairedPunctuationDirection.Opening,
        startIndex: 0,
        endIndex: 1,
        text: '(',
      },
    ]);

    const closingParenAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(')');
    expect(closingParenAnalysis.getUnmatchedPunctuationMarks()).toEqual([
      {
        direction: PairedPunctuationDirection.Closing,
        startIndex: 0,
        endIndex: 1,
        text: ')',
      },
    ]);

    const unmatchedOpeningParenAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(
      '(The rain in [Spain falls] mainly on the plain',
    );
    expect(unmatchedOpeningParenAnalysis.getUnmatchedPunctuationMarks()).toEqual([
      {
        direction: PairedPunctuationDirection.Opening,
        startIndex: 0,
        endIndex: 1,
        text: '(',
      },
    ]);

    const unmatchedClosingParenAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(
      'The rain in [Spain falls] mainly on the plain)',
    );
    expect(unmatchedClosingParenAnalysis.getUnmatchedPunctuationMarks()).toEqual([
      {
        direction: PairedPunctuationDirection.Closing,
        startIndex: 45,
        endIndex: 46,
        text: ')',
      },
    ]);

    const nestedUnmatchedOpeningMarkAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(
      '(The rain in [Spain falls) mainly on the plain',
    );
    expect(nestedUnmatchedOpeningMarkAnalysis.getUnmatchedPunctuationMarks()).toEqual([
      {
        direction: PairedPunctuationDirection.Opening,
        startIndex: 13,
        endIndex: 14,
        text: '[',
      },
    ]);

    const nestedUnmatchedClosingMarkAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(
      '(The rain in ]Spain falls) mainly on the plain',
    );
    expect(nestedUnmatchedClosingMarkAnalysis.getUnmatchedPunctuationMarks()).toEqual([
      {
        direction: PairedPunctuationDirection.Closing,
        startIndex: 13,
        endIndex: 14,
        text: ']',
      },
    ]);
  });

  it("doesn't identify unmatched Quotation mark errors", () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();

    const unmatchedOpeningQuoteAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(
      '\u201CThe (rain in [Spain]) falls mainly on the plain',
    );
    expect(unmatchedOpeningQuoteAnalysis.getUnmatchedPunctuationMarks()).toEqual([]);

    const unmatchedClosingQuoteAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(
      'The (rain in [Spain\u201D]) falls mainly on the plain',
    );
    expect(unmatchedClosingQuoteAnalysis.getUnmatchedPunctuationMarks()).toEqual([]);

    const noOtherMarksAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(
      '\u201CThe rain in Spain\u2019 falls mainly on the plain\u2019',
    );
    expect(noOtherMarksAnalysis.getUnmatchedPunctuationMarks()).toEqual([]);
  });

  it('identifies pairs of punctuation marks that incorrectly overlap', () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();

    const overlappingPairsAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(
      '(The rain in [Spain) falls] mainly on the plain.',
    );
    expect(overlappingPairsAnalysis.getOverlappingPunctuationMarks()).toEqual([
      new OverlappingPairs(
        {
          direction: PairedPunctuationDirection.Opening,
          startIndex: 13,
          endIndex: 14,
          enclosingRange: undefined,
          text: '[',
        },
        {
          direction: PairedPunctuationDirection.Closing,
          startIndex: 19,
          endIndex: 20,
          enclosingRange: undefined,
          text: ')',
        },
      ),
    ]);

    const overlapsWithQuotesAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(
      '(The rain in \u201CSpain) falls\u201D mainly on the plain.',
    );
    expect(overlapsWithQuotesAnalysis.getOverlappingPunctuationMarks()).toEqual([
      new OverlappingPairs(
        {
          direction: PairedPunctuationDirection.Opening,
          startIndex: 13,
          endIndex: 14,
          enclosingRange: undefined,
          text: '\u201C',
        },
        {
          direction: PairedPunctuationDirection.Closing,
          startIndex: 19,
          endIndex: 20,
          enclosingRange: undefined,
          text: ')',
        },
      ),
    ]);
  });
});

class TestEnvironment {
  readonly pairedPunctuationAnalyzer;

  constructor(private readonly pairedPunctuationConfig: PairedPunctuationConfig) {
    this.pairedPunctuationAnalyzer = new PairedPunctuationAnalyzer(this.pairedPunctuationConfig);
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

  newPairedPunctuationIterator(text: string): PairedPunctuationIterator {
    return new PairedPunctuationIterator(this.pairedPunctuationConfig, text);
  }
}
