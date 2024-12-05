import { DiagnosticSeverity } from '@sillsdev/lynx';
import { describe, expect, it } from 'vitest';

import { DiagnosticFactory } from '../../src/diagnostic-factory';
import {
  _privateTestingClasses,
  PairedPunctuationIterator,
} from '../../src/paired-punctuation/paired-punctuation-checker';
import { PairedPunctuationConfig } from '../../src/paired-punctuation/paired-punctuation-config';
import { PairedPunctuationDirection } from '../../src/utils';
import { StubSingleLineTextDocument } from '../test-utils';

const stubDiagnosticFactory: DiagnosticFactory = new DiagnosticFactory(
  'paired-punctuation-checker',
  new StubSingleLineTextDocument(''), // passing an empty document is fine here since we don't use getText()
);

describe('PairedPunctuationErrorFinder tests', () => {
  const pairedPunctuationConfig: PairedPunctuationConfig = new PairedPunctuationConfig.Builder()
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
    .build();

  const pairedPunctuationErrorFinder = new _privateTestingClasses.PairedPunctuationErrorFinder(
    pairedPunctuationConfig,
    stubDiagnosticFactory,
  );

  it('creates no Diagnostics for error-free text', () => {
    expect(pairedPunctuationErrorFinder.produceDiagnostics('The rain in Spain falls mainly on the plain.')).toEqual([]);
  });

  it('creates Diagnostics for unmatched paired punctuation', () => {
    expect(pairedPunctuationErrorFinder.produceDiagnostics('The (rain in Spain falls mainly on the plain.')).toEqual([
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
      },
    ]);

    expect(pairedPunctuationErrorFinder.produceDiagnostics('The [rain in Spain falls mainly on the plain.')).toEqual([
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
      },
    ]);

    expect(pairedPunctuationErrorFinder.produceDiagnostics('The {rain in Spain falls mainly on the plain.')).toEqual([
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
      },
    ]);

    expect(pairedPunctuationErrorFinder.produceDiagnostics('The <rain in Spain falls mainly on the plain.')).toEqual([
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
      },
    ]);

    expect(pairedPunctuationErrorFinder.produceDiagnostics('The )rain in Spain falls mainly on the plain.')).toEqual([
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
      },
    ]);

    expect(pairedPunctuationErrorFinder.produceDiagnostics('The ]rain in Spain falls mainly on the plain.')).toEqual([
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
      },
    ]);

    expect(pairedPunctuationErrorFinder.produceDiagnostics('The }rain in Spain falls mainly on the plain.')).toEqual([
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
      },
    ]);

    expect(pairedPunctuationErrorFinder.produceDiagnostics('The >rain in Spain falls mainly on the plain.')).toEqual([
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
      },
    ]);

    expect(pairedPunctuationErrorFinder.produceDiagnostics('The (rain in Spain falls] mainly on the plain.')).toEqual([
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
      },
    ]);

    expect(
      pairedPunctuationErrorFinder.produceDiagnostics('The \u2018rain in Spain falls mainly\u2019 on the {plain.'),
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
      },
    ]);
  });

  it('does not create Diagnostics for unmatched quotes', () => {
    expect(
      pairedPunctuationErrorFinder.produceDiagnostics('The rain in \u201CSpain falls mainly on the plain.'),
    ).toEqual([]);
    expect(
      pairedPunctuationErrorFinder.produceDiagnostics('The rain in (Spain falls mainly) on the plain.\u2019'),
    ).toEqual([]);
  });

  it('creates Diagnostics for incorrectly overlapping paired punctuation', () => {
    expect(pairedPunctuationErrorFinder.produceDiagnostics('The (rain in [Spain) falls mainly] on the plain.')).toEqual(
      [
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
        },
      ],
    );

    expect(
      pairedPunctuationErrorFinder.produceDiagnostics('The \u201Crain in {Spain\u201D falls mainly} on the plain.'),
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
      },
    ]);
  });
});

describe('PairedPunctuationIterator tests', () => {
  const pairedPunctuationConfig: PairedPunctuationConfig = new PairedPunctuationConfig.Builder()
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
    .build();

  it('does not identify any punctuation marks not in the PairedPunctuationConfig', () => {
    const emptyStringPairedPunctuationIterator: PairedPunctuationIterator = new PairedPunctuationIterator(
      pairedPunctuationConfig,
      '',
    );
    expect(emptyStringPairedPunctuationIterator.hasNext()).toBe(false);

    const noPunctuationPairedPunctuationIterator: PairedPunctuationIterator = new PairedPunctuationIterator(
      pairedPunctuationConfig,
      'The rain in Spain falls mainly on the plain',
    );
    expect(noPunctuationPairedPunctuationIterator.hasNext()).toBe(false);

    const noPairedPunctuationPairedPunctuationIterator: PairedPunctuationIterator = new PairedPunctuationIterator(
      pairedPunctuationConfig,
      'The #rain, in @Spain! falls& mainly? on^ the plain*',
    );
    expect(noPairedPunctuationPairedPunctuationIterator.hasNext()).toBe(false);

    const pairedPunctuationNotInTheConfigIterator: PairedPunctuationIterator = new PairedPunctuationIterator(
      pairedPunctuationConfig,
      '\u201EThe rain in `Spain` falls <mainly> on the plain\u201F',
    );
    expect(pairedPunctuationNotInTheConfigIterator.hasNext()).toBe(false);
  });

  it('identifies properly paired punctuation in the context of a sentence', () => {
    const pairedPunctuationIterator: PairedPunctuationIterator = new PairedPunctuationIterator(
      pairedPunctuationConfig,
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
    const pairedPunctuationIterator: PairedPunctuationIterator = new PairedPunctuationIterator(
      pairedPunctuationConfig,
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
    const backwardsPairedPunctuationConfig = new PairedPunctuationConfig.Builder()
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
      .build();

    const pairedPunctuationIterator: PairedPunctuationIterator = new PairedPunctuationIterator(
      backwardsPairedPunctuationConfig,
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

    const bizarrePairedPunctuationConfig = new PairedPunctuationConfig.Builder()
      .addRule({
        openingPunctuationMark: '+',
        closingPunctuationMark: '-',
      })
      .addRule({
        openingPunctuationMark: '/',
        closingPunctuationMark: '\\',
      })
      .build();

    const bizarrePairedPunctuationIterator: PairedPunctuationIterator = new PairedPunctuationIterator(
      bizarrePairedPunctuationConfig,
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
  const pairedPunctuationConfig: PairedPunctuationConfig = new PairedPunctuationConfig.Builder()
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
    .build();

  it('identifies no issues with well-formed text', () => {
    const pairedPunctuationAnalyzer = new _privateTestingClasses.PairedPunctuationAnalyzer(pairedPunctuationConfig);

    const emptyAnalysis = pairedPunctuationAnalyzer.analyze('');
    expect(emptyAnalysis.getOverlappingPunctuationMarks()).toEqual([]);
    expect(emptyAnalysis.getUnmatchedPunctuationMarks()).toEqual([]);

    const quotesAnalysis = pairedPunctuationAnalyzer.analyze(
      '\u201CThe rain in \u2018Spain \u201Cfalls\u201D mainly\u2019 on the plain.\u201D',
    );
    expect(quotesAnalysis.getOverlappingPunctuationMarks()).toEqual([]);
    expect(quotesAnalysis.getUnmatchedPunctuationMarks()).toEqual([]);

    const multiplePairsAnalysis = pairedPunctuationAnalyzer.analyze(
      '(The rain) in [Spain] falls {mainly} (on the plain).',
    );
    expect(multiplePairsAnalysis.getOverlappingPunctuationMarks()).toEqual([]);
    expect(multiplePairsAnalysis.getUnmatchedPunctuationMarks()).toEqual([]);

    const multipleNestedPairsAnalysis = pairedPunctuationAnalyzer.analyze(
      '(The rain in [Spain {falls} mainly] on the plain).',
    );
    expect(multipleNestedPairsAnalysis.getOverlappingPunctuationMarks()).toEqual([]);
    expect(multipleNestedPairsAnalysis.getUnmatchedPunctuationMarks()).toEqual([]);

    const quotesAndOtherPairsAnalysis = pairedPunctuationAnalyzer.analyze(
      '\u201CThe rain in (Spain \u2018falls [mainly]\u2019 on the plain).\u201D',
    );
    expect(quotesAndOtherPairsAnalysis.getOverlappingPunctuationMarks()).toEqual([]);
    expect(quotesAndOtherPairsAnalysis.getUnmatchedPunctuationMarks()).toEqual([]);
  });

  it('identifies unmatched punctuation pairs', () => {
    const pairedPunctuationAnalyzer = new _privateTestingClasses.PairedPunctuationAnalyzer(pairedPunctuationConfig);

    const openingParenAnalysis = pairedPunctuationAnalyzer.analyze('(');
    expect(openingParenAnalysis.getUnmatchedPunctuationMarks()).toEqual([
      {
        direction: PairedPunctuationDirection.Opening,
        startIndex: 0,
        endIndex: 1,
        text: '(',
      },
    ]);

    const closingParenAnalysis = pairedPunctuationAnalyzer.analyze(')');
    expect(closingParenAnalysis.getUnmatchedPunctuationMarks()).toEqual([
      {
        direction: PairedPunctuationDirection.Closing,
        startIndex: 0,
        endIndex: 1,
        text: ')',
      },
    ]);

    const unmatchedOpeningParenAnalysis = pairedPunctuationAnalyzer.analyze(
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

    const unmatchedClosingParenAnalysis = pairedPunctuationAnalyzer.analyze(
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

    const nestedUnmatchedOpeningMarkAnalysis = pairedPunctuationAnalyzer.analyze(
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

    const nestedUnmatchedClosingMarkAnalysis = pairedPunctuationAnalyzer.analyze(
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
    const pairedPunctuationAnalyzer = new _privateTestingClasses.PairedPunctuationAnalyzer(pairedPunctuationConfig);

    const unmatchedOpeningQuoteAnalysis = pairedPunctuationAnalyzer.analyze(
      '\u201CThe (rain in [Spain]) falls mainly on the plain',
    );
    expect(unmatchedOpeningQuoteAnalysis.getUnmatchedPunctuationMarks()).toEqual([]);

    const unmatchedClosingQuoteAnalysis = pairedPunctuationAnalyzer.analyze(
      'The (rain in [Spain\u201D]) falls mainly on the plain',
    );
    expect(unmatchedClosingQuoteAnalysis.getUnmatchedPunctuationMarks()).toEqual([]);

    const noOtherMarksAnalysis = pairedPunctuationAnalyzer.analyze(
      '\u201CThe rain in Spain\u2019 falls mainly on the plain\u2019',
    );
    expect(noOtherMarksAnalysis.getUnmatchedPunctuationMarks()).toEqual([]);
  });

  it('identifies pairs of punctuation marks that incorrectly overlap', () => {
    const pairedPunctuationAnalyzer = new _privateTestingClasses.PairedPunctuationAnalyzer(pairedPunctuationConfig);

    const overlappingPairsAnalysis = pairedPunctuationAnalyzer.analyze(
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

    const overlapsWithQuotesAnalysis = pairedPunctuationAnalyzer.analyze(
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
