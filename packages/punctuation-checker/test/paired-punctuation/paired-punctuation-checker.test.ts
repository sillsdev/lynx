import { DiagnosticSeverity, Localizer, TextDocumentFactory } from '@sillsdev/lynx';
import { describe, expect, it } from 'vitest';

import { DiagnosticFactory } from '../../src/diagnostic-factory';
import {
  _privateTestingClasses,
  PairedPunctuationChecker,
  PairedPunctuationIterator,
} from '../../src/paired-punctuation/paired-punctuation-checker';
import { PairedPunctuationConfig } from '../../src/paired-punctuation/paired-punctuation-config';
import { PairedPunctuationDirection } from '../../src/utils';
import { StubDocumentManager, StubSingleLineTextDocument } from '../test-utils';

describe('PairedPunctuationErrorFinder tests', () => {
  it('creates no Diagnostics for error-free text', async () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuationAndAngleBrackets();
    await testEnv.init();
    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics('The rain in Spain falls mainly on the plain.'),
    ).toEqual([]);
  });

  it('creates Diagnostics for unmatched paired punctuation', async () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuationAndAngleBrackets();
    await testEnv.init();

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics('The (rain in Spain falls mainly on the plain.'),
    ).toEqual([
      {
        code: 'unmatched-opening-parenthesis',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 0,
            character: 4,
          },
          end: {
            line: 0,
            character: 5,
          },
        },
        message: 'Opening parenthesis with no closing parenthesis.',
        data: '',
      },
    ]);

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics('The [rain in Spain falls mainly on the plain.'),
    ).toEqual([
      {
        code: 'unmatched-opening-square-bracket',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 0,
            character: 4,
          },
          end: {
            line: 0,
            character: 5,
          },
        },
        message: 'Opening square bracket with no closing bracket.',
        data: '',
      },
    ]);

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics('The {rain in Spain falls mainly on the plain.'),
    ).toEqual([
      {
        code: 'unmatched-opening-curly-bracket',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 0,
            character: 4,
          },
          end: {
            line: 0,
            character: 5,
          },
        },
        message: 'Opening curly bracket with no closing bracket.',
        data: '',
      },
    ]);

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics('The <rain in Spain falls mainly on the plain.'),
    ).toEqual([
      {
        code: 'unmatched-opening-punctuation-mark',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 0,
            character: 4,
          },
          end: {
            line: 0,
            character: 5,
          },
        },
        message: 'Opening punctuation mark with no closing mark.',
        data: '',
      },
    ]);

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics('The )rain in Spain falls mainly on the plain.'),
    ).toEqual([
      {
        code: 'unmatched-closing-parenthesis',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 0,
            character: 4,
          },
          end: {
            line: 0,
            character: 5,
          },
        },
        message: 'Closing parenthesis with no opening parenthesis.',
        data: '',
      },
    ]);

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics('The ]rain in Spain falls mainly on the plain.'),
    ).toEqual([
      {
        code: 'unmatched-closing-square-bracket',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 0,
            character: 4,
          },
          end: {
            line: 0,
            character: 5,
          },
        },
        message: 'Closing square bracket with no opening bracket.',
        data: '',
      },
    ]);

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics('The }rain in Spain falls mainly on the plain.'),
    ).toEqual([
      {
        code: 'unmatched-closing-curly-bracket',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 0,
            character: 4,
          },
          end: {
            line: 0,
            character: 5,
          },
        },
        message: 'Closing curly bracket with no opening bracket.',
        data: '',
      },
    ]);

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics('The >rain in Spain falls mainly on the plain.'),
    ).toEqual([
      {
        code: 'unmatched-closing-punctuation-mark',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 0,
            character: 4,
          },
          end: {
            line: 0,
            character: 5,
          },
        },
        message: 'Closing punctuation mark with no opening mark.',
        data: '',
      },
    ]);

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics('The (rain in Spain falls] mainly on the plain.'),
    ).toEqual([
      {
        code: 'unmatched-closing-square-bracket',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 0,
            character: 24,
          },
          end: {
            line: 0,
            character: 25,
          },
        },
        message: 'Closing square bracket with no opening bracket.',
        data: '',
      },
      {
        code: 'unmatched-opening-parenthesis',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 0,
            character: 4,
          },
          end: {
            line: 0,
            character: 5,
          },
        },
        message: 'Opening parenthesis with no closing parenthesis.',
        data: '',
      },
    ]);

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics(
        'The \u2018rain in Spain falls mainly\u2019 on the {plain.',
      ),
    ).toEqual([
      {
        code: 'unmatched-opening-curly-bracket',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 0,
            character: 40,
          },
          end: {
            line: 0,
            character: 41,
          },
        },
        message: 'Opening curly bracket with no closing bracket.',
        data: '',
      },
    ]);
  });

  it('does not create Diagnostics for unmatched quotes', async () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuationAndAngleBrackets();
    await testEnv.init();

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics('The rain in \u201CSpain falls mainly on the plain.'),
    ).toEqual([]);
    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics('The rain in (Spain falls mainly) on the plain.\u2019'),
    ).toEqual([]);
  });

  it('creates Diagnostics for incorrectly overlapping paired punctuation', async () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuationAndAngleBrackets();
    await testEnv.init();

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics('The (rain in [Spain) falls mainly] on the plain.'),
    ).toEqual([
      {
        code: 'overlapping-punctuation-pairs',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Warning,
        range: {
          start: {
            line: 0,
            character: 19,
          },
          end: {
            line: 0,
            character: 20,
          },
        },
        message: 'This pair of punctuation marks (\u2026) overlaps with another pair [\u2026].',
        data: '',
      },
      {
        code: 'overlapping-punctuation-pairs',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Warning,
        range: {
          start: {
            line: 0,
            character: 13,
          },
          end: {
            line: 0,
            character: 14,
          },
        },
        message: 'This pair of punctuation marks [\u2026] overlaps with another pair (\u2026).',
        data: '',
      },
    ]);

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics(
        'The \u201Crain in {Spain\u201D falls mainly} on the plain.',
      ),
    ).toEqual([
      {
        code: 'overlapping-punctuation-pairs',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Warning,
        range: {
          start: {
            line: 0,
            character: 19,
          },
          end: {
            line: 0,
            character: 20,
          },
        },
        message: 'This pair of punctuation marks \u201C\u2026\u201D overlaps with another pair {\u2026}.',
        data: '',
      },
      {
        code: 'overlapping-punctuation-pairs',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Warning,
        range: {
          start: {
            line: 0,
            character: 13,
          },
          end: {
            line: 0,
            character: 14,
          },
        },
        message: 'This pair of punctuation marks {\u2026} overlaps with another pair \u201C\u2026\u201D.',
        data: '',
      },
    ]);
  });
});

describe('PairedPunctuationIterator tests', () => {
  it('does not identify any punctuation marks not in the PairedPunctuationConfig', async () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();
    await testEnv.init();

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

  it('identifies properly paired punctuation in the context of a sentence', async () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();
    await testEnv.init();

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

  it('identifies malformed paired punctuation in the context of a sentence', async () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();
    await testEnv.init();

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

  it('adheres to the PairedPunctuationConfig', async () => {
    const backwardsTestEnv: TestEnvironment = TestEnvironment.createWithBackwardsPairedPunctuation();
    await backwardsTestEnv.init();

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
    await bizarreTestEnv.init();

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

describe('PairedPunctuationAnalyzer tests', () => {
  it('identifies no issues with well-formed text', async () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();
    await testEnv.init();

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

  it('identifies unmatched punctuation pairs', async () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();
    await testEnv.init();

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

  it("doesn't identify unmatched Quotation mark errors", async () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();
    await testEnv.init();

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

  it('identifies pairs of punctuation marks that incorrectly overlap', async () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();
    await testEnv.init();

    const overlappingPairsAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(
      '(The rain in [Spain) falls] mainly on the plain.',
    );
    expect(overlappingPairsAnalysis.getOverlappingPunctuationMarks()).toEqual([
      new _privateTestingClasses.OverlappingPairs(
        {
          direction: PairedPunctuationDirection.Opening,
          startIndex: 13,
          endIndex: 14,
          text: '[',
        },
        {
          direction: PairedPunctuationDirection.Closing,
          startIndex: 19,
          endIndex: 20,
          text: ')',
        },
      ),
    ]);

    const overlapsWithQuotesAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(
      '(The rain in \u201CSpain) falls\u201D mainly on the plain.',
    );
    expect(overlapsWithQuotesAnalysis.getOverlappingPunctuationMarks()).toEqual([
      new _privateTestingClasses.OverlappingPairs(
        {
          direction: PairedPunctuationDirection.Opening,
          startIndex: 13,
          endIndex: 14,
          text: '\u201C',
        },
        {
          direction: PairedPunctuationDirection.Closing,
          startIndex: 19,
          endIndex: 20,
          text: ')',
        },
      ),
    ]);
  });
});

describe('PairedPunctuationChecker tests', () => {
  it('produces DiagnosticFixes for unmatched marks', async () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();
    await testEnv.init();

    expect(
      await testEnv.pairedPunctuationChecker.getDiagnosticFixes('(Hello', {
        code: 'unmatched-opening-parenthesis',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 0,
            character: 0,
          },
          end: {
            line: 0,
            character: 1,
          },
        },
        message: 'Opening parenthesis with no closing parenthesis.',
      }),
    ).toEqual([
      {
        title: `Delete punctuation mark`,
        isPreferred: false,
        diagnostic: {
          code: 'unmatched-opening-parenthesis',
          source: 'paired-punctuation-checker',
          severity: DiagnosticSeverity.Error,
          range: {
            start: {
              line: 0,
              character: 0,
            },
            end: {
              line: 0,
              character: 1,
            },
          },
          message: 'Opening parenthesis with no closing parenthesis.',
        },
        edits: [
          {
            range: {
              start: {
                line: 0,
                character: 0,
              },
              end: {
                line: 0,
                character: 1,
              },
            },
            newText: '',
          },
        ],
      },
    ]);
  });

  it('does not produce DiagnosticFixes for overlapping pairs of marks', async () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();
    await testEnv.init();

    expect(
      await testEnv.pairedPunctuationChecker.getDiagnosticFixes('(Hello\u201C) there\u201D', {
        code: 'overlapping-punctuation-pairs',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Warning,
        range: {
          start: {
            line: 0,
            character: 7,
          },
          end: {
            line: 0,
            character: 8,
          },
        },
        message: 'This pair of punctuation marks (\u2026) overlaps with another pair \u201C\u2026\u201D.',
      }),
    ).toEqual([]);
  });

  it('initializes its own namespace in the localizer', async () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();
    await testEnv.init();

    expect(
      await testEnv.pairedPunctuationChecker.getDiagnostics('The [rain in Spain falls mainly on the plain.'),
    ).toEqual([
      {
        code: 'unmatched-opening-square-bracket',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 0,
            character: 4,
          },
          end: {
            line: 0,
            character: 5,
          },
        },
        message: 'Opening square bracket with no closing bracket.',
        data: '',
      },
    ]);

    expect(
      await testEnv.pairedPunctuationChecker.getDiagnostics(
        'The {rain in \u2018Spain} falls mainly\u2019 on the plain.',
      ),
    ).toEqual([
      {
        code: 'overlapping-punctuation-pairs',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Warning,
        range: {
          start: {
            line: 0,
            character: 19,
          },
          end: {
            line: 0,
            character: 20,
          },
        },
        message: 'This pair of punctuation marks {\u2026} overlaps with another pair \u2018\u2026\u2019.',
        data: '',
      },
      {
        code: 'overlapping-punctuation-pairs',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Warning,
        range: {
          start: {
            line: 0,
            character: 13,
          },
          end: {
            line: 0,
            character: 14,
          },
        },
        message: 'This pair of punctuation marks \u2018\u2026\u2019 overlaps with another pair {\u2026}.',
        data: '',
      },
    ]);
  });

  it('gets its messages from the localizer', async () => {
    const customLocalizer: Localizer = new Localizer();
    customLocalizer.addNamespace('pairedPunctuation', (_language: string) => {
      return {
        diagnosticMessagesByCode: {
          'unmatched-opening-square-bracket': "You didn't close your opening square bracket.",
          'overlapping-punctuation-pairs': "You really shouldn't overlap {{firstPair}} with {{secondPair}}.",
        },
      };
    });

    const testEnv: TestEnvironment =
      TestEnvironment.createWithStandardPairedPunctuationAndCustomLocalizer(customLocalizer);
    await testEnv.init();

    expect(
      await testEnv.pairedPunctuationChecker.getDiagnostics('The [rain in Spain falls mainly on the plain.'),
    ).toEqual([
      {
        code: 'unmatched-opening-square-bracket',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 0,
            character: 4,
          },
          end: {
            line: 0,
            character: 5,
          },
        },
        message: "You didn't close your opening square bracket.",
        data: '',
      },
    ]);

    expect(
      await testEnv.pairedPunctuationChecker.getDiagnostics(
        'The {rain in \u2018Spain} falls mainly\u2019 on the plain.',
      ),
    ).toEqual([
      {
        code: 'overlapping-punctuation-pairs',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Warning,
        range: {
          start: {
            line: 0,
            character: 19,
          },
          end: {
            line: 0,
            character: 20,
          },
        },
        message: "You really shouldn't overlap {\u2026} with \u2018\u2026\u2019.",
        data: '',
      },
      {
        code: 'overlapping-punctuation-pairs',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Warning,
        range: {
          start: {
            line: 0,
            character: 13,
          },
          end: {
            line: 0,
            character: 14,
          },
        },
        message: "You really shouldn't overlap \u2018\u2026\u2019 with {\u2026}.",
        data: '',
      },
    ]);
  });
});

class TestEnvironment {
  readonly pairedPunctuationErrorFinder;
  readonly pairedPunctuationAnalyzer;
  readonly pairedPunctuationChecker: PairedPunctuationChecker;

  private readonly pairedPunctuationErrorFinderLocalizer: Localizer; // we have separate localizers for the two classes
  private readonly pairedPunctuationCheckerLocalizer: Localizer; // since QuotationChecker populates the localizer on its own

  constructor(
    private readonly pairedPunctuationConfig: PairedPunctuationConfig,
    private readonly customLocalizer?: Localizer,
  ) {
    this.pairedPunctuationErrorFinderLocalizer = this.createDefaultLocalizer();
    this.pairedPunctuationCheckerLocalizer = new Localizer();

    const stubDiagnosticFactory: DiagnosticFactory = new DiagnosticFactory(
      'paired-punctuation-checker',
      new StubSingleLineTextDocument(''), // passing an empty document is fine here since we don't use getText()
    );
    this.pairedPunctuationErrorFinder = new _privateTestingClasses.PairedPunctuationErrorFinder(
      this.customLocalizer ?? this.pairedPunctuationErrorFinderLocalizer,
      this.pairedPunctuationConfig,
      stubDiagnosticFactory,
    );

    this.pairedPunctuationAnalyzer = new _privateTestingClasses.PairedPunctuationAnalyzer(this.pairedPunctuationConfig);

    const stubDocumentManager: StubDocumentManager = new StubDocumentManager(new TextDocumentFactory());
    this.pairedPunctuationChecker = new PairedPunctuationChecker(
      this.customLocalizer ?? this.pairedPunctuationCheckerLocalizer,
      stubDocumentManager,
      pairedPunctuationConfig,
    );
  }

  private createDefaultLocalizer(): Localizer {
    const defaultLocalizer: Localizer = new Localizer();
    defaultLocalizer.addNamespace('pairedPunctuation', (_language: string) => {
      return {
        diagnosticMessagesByCode: {
          'unmatched-opening-parenthesis': 'Opening parenthesis with no closing parenthesis.',
          'unmatched-closing-parenthesis': 'Closing parenthesis with no opening parenthesis.',
          'unmatched-opening-square-bracket': 'Opening square bracket with no closing bracket.',
          'unmatched-closing-square-bracket': 'Closing square bracket with no opening bracket.',
          'unmatched-opening-curly-bracket': 'Opening curly bracket with no closing bracket.',
          'unmatched-closing-curly-bracket': 'Closing curly bracket with no opening bracket.',
          'unmatched-opening-punctuation-mark': 'Opening punctuation mark with no closing mark.',
          'unmatched-closing-punctuation-mark': 'Closing punctuation mark with no opening mark.',
          'overlapping-punctuation-pairs':
            'This pair of punctuation marks {{firstPair}} overlaps with another pair {{secondPair}}.',
        },
      };
    });
    return defaultLocalizer;
  }

  public async init(): Promise<void> {
    await this.pairedPunctuationChecker.init();
    await this.pairedPunctuationErrorFinderLocalizer.init();
    await this.pairedPunctuationCheckerLocalizer.init();

    await this.customLocalizer?.init();
  }

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

  static createWithStandardPairedPunctuationAndCustomLocalizer(customLocalizer: Localizer): TestEnvironment {
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
      customLocalizer,
    );
  }

  newPairedPunctuationIterator(text: string): PairedPunctuationIterator {
    return new PairedPunctuationIterator(this.pairedPunctuationConfig, text);
  }
}
