import {
  Diagnostic,
  DiagnosticSeverity,
  DocumentManager,
  Localizer,
  ScriptureDocument,
  TextDocument,
  TextDocumentFactory,
} from '@sillsdev/lynx';
import { UsfmDocumentFactory } from '@sillsdev/lynx-usfm';
import { UsfmStylesheet } from '@sillsdev/machine/corpora';
import { describe, expect, it } from 'vitest';

import { DiagnosticFactory } from '../../src/diagnostic-factory';
import { _privateTestingClasses, QuotationChecker } from '../../src/quotation/quotation-checker';
import { QuotationConfig } from '../../src/quotation/quotation-config';
import { QuotationDepth, QuotationRootLevel } from '../../src/quotation/quotation-utils';
import { StringContextMatcher } from '../../src/utils';
import { StubDocumentManager, StubSingleLineTextDocument } from '../test-utils';

const defaultLocalizer: Localizer = new Localizer();
defaultLocalizer.addNamespace('quotation', (_language: string) => {
  return {
    diagnosticMessagesByCode: {
      'unmatched-opening-quotation-mark': 'Opening quotation mark with no closing mark.',
      'unmatched-closing-quotation-mark': 'Closing quotation mark with no opening mark.',
      'incorrectly-nested-quotation-mark-level-': 'Incorrectly nested quotation mark.',
      'ambiguous-quotation-mark-': 'This quotation mark is ambiguous.',
      'deeply-nested-quotation-mark': 'Too many levels of quotation marks. Consider rephrasing to avoid this.',
    },
  };
});
await defaultLocalizer.init();

// Functions/objects for creating expected output objects
const stubDiagnosticFactory: DiagnosticFactory = new DiagnosticFactory(
  'quotation-mark-checker',
  new StubSingleLineTextDocument(''), // passing an empty document is fine here since we don't use getText()
);

function createUnmatchedOpeningQuoteDiagnostic(startOffset: number, endOffset: number): Diagnostic {
  return {
    code: 'unmatched-opening-quotation-mark',
    severity: DiagnosticSeverity.Error,
    range: {
      start: {
        line: 0,
        character: startOffset,
      },
      end: {
        line: 0,
        character: endOffset,
      },
    },
    source: 'quotation-mark-checker',
    message: `Opening quotation mark with no closing mark.`,
    data: '',
  };
}

function createUnmatchedClosingQuoteDiagnostic(startOffset: number, endOffset: number): Diagnostic {
  return {
    code: 'unmatched-closing-quotation-mark',
    severity: DiagnosticSeverity.Error,
    range: {
      start: {
        line: 0,
        character: startOffset,
      },
      end: {
        line: 0,
        character: endOffset,
      },
    },
    source: 'quotation-mark-checker',
    message: `Closing quotation mark with no opening mark.`,
    data: '',
  };
}

function createIncorrectlyNestedDiagnostic(
  startOffset: number,
  endOffset: number,
  parentDepth: QuotationDepth,
): Diagnostic {
  return {
    code: 'incorrectly-nested-quotation-mark-level-' + parentDepth.asNumber().toFixed(),
    severity: DiagnosticSeverity.Warning,
    range: {
      start: {
        line: 0,
        character: startOffset,
      },
      end: {
        line: 0,
        character: endOffset,
      },
    },
    source: 'quotation-mark-checker',
    message: `Incorrectly nested quotation mark.`,
    data: '',
  };
}

function createAmbiguousDiagnostic(
  startOffset: number,
  endOffset: number,
  ambiguousMark: string,
  unambiguousMark: string,
): Diagnostic {
  return {
    code: 'ambiguous-quotation-mark-' + ambiguousMark + '-to-' + unambiguousMark,
    severity: DiagnosticSeverity.Warning,
    range: {
      start: {
        line: 0,
        character: startOffset,
      },
      end: {
        line: 0,
        character: endOffset,
      },
    },
    source: 'quotation-mark-checker',
    message: `This quotation mark is ambiguous.`,
    data: '',
  };
}

function createTooDeeplyNestedDiagnostic(startOffset: number, endOffset: number): Diagnostic {
  return {
    code: 'deeply-nested-quotation-mark',
    severity: DiagnosticSeverity.Warning,
    range: {
      start: {
        line: 0,
        character: startOffset,
      },
      end: {
        line: 0,
        character: endOffset,
      },
    },
    source: 'quotation-mark-checker',
    message: 'Too many levels of quotation marks. Consider rephrasing to avoid this.',
    data: '',
  };
}

describe('QuotationErrorFinder tests', () => {
  it('keeps no internal state', () => {
    const quotationConfig = new QuotationConfig.Builder()
      .setTopLevelQuotationMarks({
        openingPunctuationMark: '\u201C',
        closingPunctuationMark: '\u201D',
      })
      .mapAmbiguousQuotationMark('"', '\u201C')
      .mapAmbiguousQuotationMark('"', '\u201D')
      .build();
    const quotationErrorFinder = new _privateTestingClasses.QuotationErrorFinder(
      defaultLocalizer,
      quotationConfig,
      stubDiagnosticFactory,
    );
    expect(quotationErrorFinder.produceDiagnostics('Sample text \u201Dwith more text')).toEqual([
      createUnmatchedClosingQuoteDiagnostic(12, 13),
    ]);
    expect(quotationErrorFinder.produceDiagnostics('Sample text \u201Dwith more text')).toEqual([
      createUnmatchedClosingQuoteDiagnostic(12, 13),
    ]);
    expect(quotationErrorFinder.produceDiagnostics('Sample text with no quote')).toEqual([]);
  });

  describe('For standard English top-level quotes', () => {
    const quotationConfig = new QuotationConfig.Builder()
      .setTopLevelQuotationMarks({
        openingPunctuationMark: '\u201C',
        closingPunctuationMark: '\u201D',
      })
      .mapAmbiguousQuotationMark('"', '\u201C')
      .mapAmbiguousQuotationMark('"', '\u201D')
      .build();

    it('creates Diagnostics for unmatched quotation marks', () => {
      const quotationErrorFinder = new _privateTestingClasses.QuotationErrorFinder(
        defaultLocalizer,
        quotationConfig,
        stubDiagnosticFactory,
      );

      expect(quotationErrorFinder.produceDiagnostics('Sample text \u201Cwith more text')).toEqual([
        createUnmatchedOpeningQuoteDiagnostic(12, 13),
      ]);
      expect(quotationErrorFinder.produceDiagnostics('Sample text \u201Dwith more text')).toEqual([
        createUnmatchedClosingQuoteDiagnostic(12, 13),
      ]);
      expect(quotationErrorFinder.produceDiagnostics('\u201CSample text\u201D \u201Cwith more text')).toEqual([
        createUnmatchedOpeningQuoteDiagnostic(14, 15),
      ]);
      expect(quotationErrorFinder.produceDiagnostics('\u201CSample text\u201D \u201Dwith more text')).toEqual([
        createUnmatchedClosingQuoteDiagnostic(14, 15),
      ]);
    });

    it('creates Diagnostics for incorrectly nested quotation marks', () => {
      const quotationErrorFinder = new _privateTestingClasses.QuotationErrorFinder(
        defaultLocalizer,
        quotationConfig,
        stubDiagnosticFactory,
      );

      expect(quotationErrorFinder.produceDiagnostics('\u201CSample text \u201Cwith more text\u201D')).toEqual([
        createUnmatchedOpeningQuoteDiagnostic(0, 1),
        createIncorrectlyNestedDiagnostic(13, 14, QuotationDepth.Primary),
      ]);
    });

    it('creates Diagnostics for ambiguous quotation marks', () => {
      const quotationErrorFinder = new _privateTestingClasses.QuotationErrorFinder(
        defaultLocalizer,
        quotationConfig,
        stubDiagnosticFactory,
      );

      expect(quotationErrorFinder.produceDiagnostics('"Sample text"')).toEqual([
        createAmbiguousDiagnostic(0, 1, '"', '\u201C'),
        createAmbiguousDiagnostic(12, 13, '"', '\u201D'),
      ]);
    });
  });

  describe('For multi-level English quotes', () => {
    const quotationConfig = new QuotationConfig.Builder()
      .setTopLevelQuotationMarks({
        openingPunctuationMark: '\u201C',
        closingPunctuationMark: '\u201D',
      })
      .addNestedQuotationMarks({
        openingPunctuationMark: '\u2018',
        closingPunctuationMark: '\u2019',
      })
      .addNestedQuotationMarks({
        openingPunctuationMark: '\u201C',
        closingPunctuationMark: '\u201D',
      })
      .addNestedQuotationMarks({
        openingPunctuationMark: '\u2018',
        closingPunctuationMark: '\u2019',
      })
      .mapAmbiguousQuotationMark('"', '\u201C')
      .mapAmbiguousQuotationMark('"', '\u201D')
      .mapAmbiguousQuotationMark("'", '\u2018')
      .mapAmbiguousQuotationMark("'", '\u2019')
      .setNestingWarningDepth(QuotationDepth.fromNumber(4))
      .build();

    const quotationErrorFinder = new _privateTestingClasses.QuotationErrorFinder(
      defaultLocalizer,
      quotationConfig,
      stubDiagnosticFactory,
    );

    it('creates Diagnostics for unmatched opening quotation marks', () => {
      expect(quotationErrorFinder.produceDiagnostics('\u201CSample text \u201Cwith more text\u201D')).toEqual([
        createUnmatchedOpeningQuoteDiagnostic(0, 1),
        createIncorrectlyNestedDiagnostic(13, 14, QuotationDepth.fromNumber(1)),
      ]);

      expect(
        quotationErrorFinder.produceDiagnostics('\u201CThis contains two \u2018levels of unclosed quotes'),
      ).toEqual([createUnmatchedOpeningQuoteDiagnostic(0, 1), createUnmatchedOpeningQuoteDiagnostic(19, 20)]);

      expect(
        quotationErrorFinder.produceDiagnostics('\u201CThis contains an \u2018unclosed second level quote\u201D'),
      ).toEqual([createUnmatchedOpeningQuoteDiagnostic(18, 19)]);

      expect(
        quotationErrorFinder.produceDiagnostics('\u201CThis contains three \u2018levels of unclosed \u201Cquotes'),
      ).toEqual([
        createUnmatchedOpeningQuoteDiagnostic(0, 1),
        createUnmatchedOpeningQuoteDiagnostic(21, 22),
        createUnmatchedOpeningQuoteDiagnostic(41, 42),
      ]);

      expect(
        quotationErrorFinder.produceDiagnostics('\u201CThis contains two \u2018levels of unclosed \u201Cquotes\u201D'),
      ).toEqual([createUnmatchedOpeningQuoteDiagnostic(0, 1), createUnmatchedOpeningQuoteDiagnostic(19, 20)]);

      expect(
        quotationErrorFinder.produceDiagnostics(
          '\u201CThis contains one \u2018level of unclosed \u201Cquotes\u201D\u2019',
        ),
      ).toEqual([createUnmatchedOpeningQuoteDiagnostic(0, 1)]);

      expect(
        quotationErrorFinder.produceDiagnostics('\u201CThis contains a nested \u2018unclosed quote\u201D'),
      ).toEqual([createUnmatchedOpeningQuoteDiagnostic(24, 25)]);

      expect(quotationErrorFinder.produceDiagnostics('"This has an \u2018ambiguous\u2019 unclosed quote')).toEqual([
        createUnmatchedOpeningQuoteDiagnostic(0, 1),
        createAmbiguousDiagnostic(0, 1, '"', '\u201C'),
      ]);

      expect(quotationErrorFinder.produceDiagnostics("\u201CThis has an 'ambiguous unclosed quote\u201D")).toEqual([
        createUnmatchedOpeningQuoteDiagnostic(13, 14),
        createAmbiguousDiagnostic(13, 14, "'", '\u2018'),
      ]);

      expect(quotationErrorFinder.produceDiagnostics('\u201CThis text has an ambiguous\u201D unpaired" quote')).toEqual(
        [createUnmatchedOpeningQuoteDiagnostic(37, 38), createAmbiguousDiagnostic(37, 38, '"', '\u201C')],
      );

      expect(quotationErrorFinder.produceDiagnostics("\u201CThis text has an ambiguous\u201D unpaired' quote")).toEqual(
        [
          createUnmatchedOpeningQuoteDiagnostic(37, 38),
          createIncorrectlyNestedDiagnostic(37, 38, new QuotationRootLevel()),
          createAmbiguousDiagnostic(37, 38, "'", '\u2018'),
        ],
      );
    });

    it('creates Diagnostics for unmatched closing quotation marks', () => {
      expect(quotationErrorFinder.produceDiagnostics('Text with an \u2018unpaired\u2019 closing quote\u201D')).toEqual([
        createUnmatchedClosingQuoteDiagnostic(37, 38),
        createIncorrectlyNestedDiagnostic(13, 14, new QuotationRootLevel()),
      ]);

      expect(quotationErrorFinder.produceDiagnostics('\u201CText with an unpaired\u2019 closing quote\u201D')).toEqual([
        createUnmatchedClosingQuoteDiagnostic(22, 23),
      ]);

      expect(quotationErrorFinder.produceDiagnostics('This text has multiple\u2019 unpaired quotes\u201D')).toEqual([
        createUnmatchedClosingQuoteDiagnostic(22, 23),
        createUnmatchedClosingQuoteDiagnostic(39, 40),
      ]);

      expect(
        quotationErrorFinder.produceDiagnostics('\u201CThis text has multiple\u201D unpaired\u2019 quotes\u201D'),
      ).toEqual([createUnmatchedClosingQuoteDiagnostic(33, 34), createUnmatchedClosingQuoteDiagnostic(41, 42)]);
    });

    it('creates Diagnostics for incorrectly nested quotation marks', () => {
      expect(quotationErrorFinder.produceDiagnostics('\u2018\u2019')).toEqual([
        createIncorrectlyNestedDiagnostic(0, 1, new QuotationRootLevel()),
      ]);

      expect(
        quotationErrorFinder.produceDiagnostics(
          '\u201CThis text has a \u2018secondary quote \u2018opening inside a secondary quote\u2019\u2019\u201D',
        ),
      ).toEqual([
        createIncorrectlyNestedDiagnostic(34, 35, QuotationDepth.fromNumber(2)),
        createTooDeeplyNestedDiagnostic(34, 35),
        createTooDeeplyNestedDiagnostic(67, 68),
      ]);

      expect(
        quotationErrorFinder.produceDiagnostics(
          '\u201CThis text has a \u2018tertiary quote \u201Copening \u201Cinside a tertiary quote\u201D\u201D\u2019\u201D',
        ),
      ).toEqual([createIncorrectlyNestedDiagnostic(42, 43, QuotationDepth.fromNumber(3))]);

      expect(
        quotationErrorFinder.produceDiagnostics(
          "\u201CThis text has a 'secondary quote \u2018opening inside a secondary quote\u2019\u2019\u201D",
        ),
      ).toEqual([
        createIncorrectlyNestedDiagnostic(34, 35, QuotationDepth.fromNumber(2)),
        createAmbiguousDiagnostic(17, 18, "'", '\u2018'),
        createTooDeeplyNestedDiagnostic(34, 35),
        createTooDeeplyNestedDiagnostic(67, 68),
      ]);
    });

    it('creates Diagnostics for ambiguous quotation marks', () => {
      expect(quotationErrorFinder.produceDiagnostics("\u201CSample 'text'\u201D")).toEqual([
        createAmbiguousDiagnostic(8, 9, "'", '\u2018'),
        createAmbiguousDiagnostic(13, 14, "'", '\u2019'),
      ]);

      expect(
        quotationErrorFinder.produceDiagnostics(
          '\u201CSample \u2018text with an "ambiguous" third level quote\u2019\u201D',
        ),
      ).toEqual([createAmbiguousDiagnostic(22, 23, '"', '\u201C'), createAmbiguousDiagnostic(32, 33, '"', '\u201D')]);

      expect(quotationErrorFinder.produceDiagnostics('\u201CText with mixed \'ambiguous\u2019 quotes"')).toEqual([
        createAmbiguousDiagnostic(17, 18, "'", '\u2018'),
        createAmbiguousDiagnostic(35, 36, '"', '\u201D'),
      ]);
    });

    it('creates Diagnostics for quotation marks that are too deeply nested', () => {
      expect(
        quotationErrorFinder.produceDiagnostics(
          '\u201CThis \u2018has \u201Cfour \u2018levels\u2019 of\u201D quotes\u2019\u201D',
        ),
      ).toEqual([createTooDeeplyNestedDiagnostic(17, 18), createTooDeeplyNestedDiagnostic(24, 25)]);

      expect(quotationErrorFinder.produceDiagnostics('"This \'has "four \'levels\' of" quotes\'"')).toEqual([
        createAmbiguousDiagnostic(0, 1, '"', '\u201C'),
        createAmbiguousDiagnostic(6, 7, "'", '\u2018'),
        createAmbiguousDiagnostic(11, 12, '"', '\u201C'),
        createAmbiguousDiagnostic(17, 18, "'", '\u2018'),
        createAmbiguousDiagnostic(24, 25, "'", '\u2019'),
        createAmbiguousDiagnostic(28, 29, '"', '\u201D'),
        createAmbiguousDiagnostic(36, 37, "'", '\u2019'),
        createAmbiguousDiagnostic(37, 38, '"', '\u201D'),
        createTooDeeplyNestedDiagnostic(17, 18),
        createTooDeeplyNestedDiagnostic(24, 25),
      ]);
    });
  });

  describe('For a system with different 1st- and 3rd-level quotes', () => {
    const quotationConfig = new QuotationConfig.Builder()
      .setTopLevelQuotationMarks({
        openingPunctuationMark: '\u201C',
        closingPunctuationMark: '\u201D',
      })
      .addNestedQuotationMarks({
        openingPunctuationMark: '\u2018',
        closingPunctuationMark: '\u2019',
      })
      .addNestedQuotationMarks({
        openingPunctuationMark: '\u201E',
        closingPunctuationMark: '\u201F',
      })
      .build();
    const quotationErrorFinder = new _privateTestingClasses.QuotationErrorFinder(
      defaultLocalizer,
      quotationConfig,
      stubDiagnosticFactory,
    );

    it('creates Diagnostics for unmatched opening quotation marks', () => {
      expect(
        quotationErrorFinder.produceDiagnostics(
          '\u201CThis text has a \u2018primary \u201Equote\u201D closing inside a tertiary quote',
        ),
      ).toEqual([createUnmatchedOpeningQuoteDiagnostic(26, 27), createUnmatchedOpeningQuoteDiagnostic(17, 18)]);

      expect(
        quotationErrorFinder.produceDiagnostics(
          '\u201CThis text has a \u2018primary \u201Equote\u2019 closing inside a tertiary quote\u201D',
        ),
      ).toEqual([createUnmatchedOpeningQuoteDiagnostic(26, 27)]);
    });

    it('creates Diagnostics for unmatched closing quotation marks', () => {
      expect(
        quotationErrorFinder.produceDiagnostics('\u201CText \u2018with an unpaired\u201F\u2019 closing quote\u201D'),
      ).toEqual([createUnmatchedClosingQuoteDiagnostic(23, 24)]);

      expect(
        quotationErrorFinder.produceDiagnostics(
          '\u201CThis text has a\u2019 secondary quote closing inside a primary quote\u201D',
        ),
      ).toEqual([createUnmatchedClosingQuoteDiagnostic(16, 17)]);

      expect(
        quotationErrorFinder.produceDiagnostics(
          '\u201CThis text has a\u2018 tertiary quote\u201F closing inside a secondary quote\u2019\u201D',
        ),
      ).toEqual([createUnmatchedClosingQuoteDiagnostic(32, 33)]);

      expect(
        quotationErrorFinder.produceDiagnostics(
          '\u201CThis text has a tertiary quote\u201F closing inside a primary quote\u201D',
        ),
      ).toEqual([createUnmatchedClosingQuoteDiagnostic(31, 32)]);
    });

    it('creates Diagnostics for incorrectly nested quotation marks', () => {
      expect(quotationErrorFinder.produceDiagnostics('\u201E\u201F')).toEqual([
        createIncorrectlyNestedDiagnostic(0, 1, new QuotationRootLevel()),
      ]);

      expect(quotationErrorFinder.produceDiagnostics('\u201C\u201E\u201F\u201D')).toEqual([
        createIncorrectlyNestedDiagnostic(1, 2, QuotationDepth.fromNumber(1)),
      ]);

      expect(
        quotationErrorFinder.produceDiagnostics(
          '\u201CThis text has a \u201Etertiary quote opening in a primary context\u201F\u201D',
        ),
      ).toEqual([createIncorrectlyNestedDiagnostic(17, 18, QuotationDepth.fromNumber(1))]);

      expect(
        quotationErrorFinder.produceDiagnostics(
          '\u201CThis text \u2018contains a \u201Esecond-level \u2018quote\u2019 inside a third-level quote\u201F\u2019\u201D',
        ),
      ).toEqual([createIncorrectlyNestedDiagnostic(37, 38, QuotationDepth.fromNumber(3))]);

      expect(
        quotationErrorFinder.produceDiagnostics(
          '\u201CThis text \u2018contains a \u201Efirst-level \u201Cquote\u201D inside a third-level quote\u201F\u2019\u201D',
        ),
      ).toEqual([createIncorrectlyNestedDiagnostic(36, 37, QuotationDepth.fromNumber(3))]);

      expect(
        quotationErrorFinder.produceDiagnostics(
          '\u201CThis text \u2018contains a first-level \u201Cquote\u201D inside a second-level quote\u2019\u201D',
        ),
      ).toEqual([createIncorrectlyNestedDiagnostic(35, 36, QuotationDepth.fromNumber(2))]);
    });
  });
});

describe('QuotationChecker tests', () => {
  const stubDocumentManager: DocumentManager<TextDocument> = new StubDocumentManager(new TextDocumentFactory());
  const quotationConfig: QuotationConfig = new QuotationConfig.Builder()
    .setTopLevelQuotationMarks({
      openingPunctuationMark: '\u201C',
      closingPunctuationMark: '\u201D',
    })
    .addNestedQuotationMarks({
      openingPunctuationMark: '\u2018',
      closingPunctuationMark: '\u2019',
    })
    .addNestedQuotationMarks({
      openingPunctuationMark: '\u201E',
      closingPunctuationMark: '\u201F',
    })
    .build();

  it('provides DiagnosticFixes to remove the character for mismatched quotes', async () => {
    const localizer: Localizer = new Localizer();
    const quotationChecker: QuotationChecker = new QuotationChecker(localizer, stubDocumentManager, quotationConfig);
    await quotationChecker.init();
    await localizer.init();
    const unmatchedOpeningQuoteDiagnostic: Diagnostic = {
      code: 'unmatched-opening-quotation-mark',
      severity: DiagnosticSeverity.Error,
      range: {
        start: {
          line: 0,
          character: 8,
        },
        end: {
          line: 0,
          character: 9,
        },
      },
      source: 'quotation-mark-checker',
      message: `Opening quotation mark with no closing mark.`,
    };

    const unmatchedClosingQuoteDiagnostic: Diagnostic = {
      code: 'unmatched-opening-quotation-mark',
      severity: DiagnosticSeverity.Error,
      range: {
        start: {
          line: 0,
          character: 15,
        },
        end: {
          line: 0,
          character: 16,
        },
      },
      source: 'quotation-mark-checker',
      message: `Opening quotation mark with no closing mark.`,
    };

    expect(await quotationChecker.getDiagnosticFixes('', unmatchedOpeningQuoteDiagnostic)).toEqual([
      {
        title: 'Delete punctuation mark',
        isPreferred: false,
        diagnostic: unmatchedOpeningQuoteDiagnostic,
        edits: [
          {
            range: unmatchedOpeningQuoteDiagnostic.range,
            newText: '',
          },
        ],
      },
    ]);

    expect(await quotationChecker.getDiagnosticFixes('', unmatchedClosingQuoteDiagnostic)).toEqual([
      {
        title: 'Delete punctuation mark',
        isPreferred: false,
        diagnostic: unmatchedClosingQuoteDiagnostic,
        edits: [
          {
            range: unmatchedClosingQuoteDiagnostic.range,
            newText: '',
          },
        ],
      },
    ]);
  });

  it('provides DiagnosticFixes to remove or replace the character for incorrectly nested quotes', async () => {
    const localizer: Localizer = new Localizer();
    const quotationChecker: QuotationChecker = new QuotationChecker(localizer, stubDocumentManager, quotationConfig);
    await quotationChecker.init();
    await localizer.init();

    const incorrectlyNestedDiagnostic: Diagnostic = {
      code: 'incorrectly-nested-quotation-mark-level-2',
      severity: DiagnosticSeverity.Warning,
      range: {
        start: {
          line: 0,
          character: 12,
        },
        end: {
          line: 0,
          character: 13,
        },
      },
      source: 'quotation-mark-checker',
      message: `Incorrectly nested quotation mark.`,
    };

    expect(await quotationChecker.getDiagnosticFixes('', incorrectlyNestedDiagnostic)).toEqual([
      {
        title: 'Delete punctuation mark',
        isPreferred: false,
        diagnostic: incorrectlyNestedDiagnostic,
        edits: [
          {
            range: incorrectlyNestedDiagnostic.range,
            newText: '',
          },
        ],
      },
      {
        title: 'Replace this character with \u201E',
        isPreferred: true,
        diagnostic: incorrectlyNestedDiagnostic,
        edits: [
          {
            range: incorrectlyNestedDiagnostic.range,
            newText: '\u201E',
          },
        ],
      },
    ]);
  });

  it('provides DiagnosticFixes to replace the character for ambiguous quotes', async () => {
    const localizer: Localizer = new Localizer();
    const quotationChecker: QuotationChecker = new QuotationChecker(localizer, stubDocumentManager, quotationConfig);
    await quotationChecker.init();
    await localizer.init();

    const ambiguousDiagnostic: Diagnostic = {
      code: 'ambiguous-quotation-mark-"-to-\u201C',
      severity: DiagnosticSeverity.Warning,
      range: {
        start: {
          line: 5,
          character: 51,
        },
        end: {
          line: 5,
          character: 52,
        },
      },
      source: 'quotation-mark-checker',
      message: `This quotation mark is ambiguous.`,
    };

    expect(await quotationChecker.getDiagnosticFixes('', ambiguousDiagnostic)).toEqual([
      {
        title: 'Replace this character with \u201C',
        isPreferred: true,
        diagnostic: ambiguousDiagnostic,
        edits: [
          {
            range: ambiguousDiagnostic.range,
            newText: '\u201C',
          },
        ],
      },
    ]);
  });

  it('provides no DiagnosticFixes for too deeply nested quotes', async () => {
    const quotationChecker: QuotationChecker = new QuotationChecker(
      defaultLocalizer,
      stubDocumentManager,
      quotationConfig,
    );
    await quotationChecker.init();

    const tooDeeplyNestedDiagnostic: Diagnostic = {
      code: 'deeply-nested-quotation-mark',
      severity: DiagnosticSeverity.Warning,
      range: {
        start: {
          line: 1,
          character: 5,
        },
        end: {
          line: 1,
          character: 6,
        },
      },
      source: 'quotation-mark-checker',
      message: `Too many levels of quotation marks. Consider rephrasing to avoid this.`,
    };

    expect(await quotationChecker.getDiagnosticFixes('', tooDeeplyNestedDiagnostic)).toEqual([]);
  });
});

describe('ScriptureDocument tests', () => {
  const stylesheet = new UsfmStylesheet('usfm.sty');
  const documentFactory = new UsfmDocumentFactory(stylesheet);
  const quotationConfig = new QuotationConfig.Builder()
    .setTopLevelQuotationMarks({
      openingPunctuationMark: '\u201C',
      closingPunctuationMark: '\u201D',
    })
    .addNestedQuotationMarks({
      openingPunctuationMark: '\u2018',
      closingPunctuationMark: '\u2019',
    })
    .addNestedQuotationMarks({
      openingPunctuationMark: '\u201C',
      closingPunctuationMark: '\u201D',
    })
    .addNestedQuotationMarks({
      openingPunctuationMark: '\u2018',
      closingPunctuationMark: '\u2019',
    })
    .mapAmbiguousQuotationMark('"', '\u201C')
    .mapAmbiguousQuotationMark('"', '\u201D')
    .mapAmbiguousQuotationMark("'", '\u2018')
    .mapAmbiguousQuotationMark("'", '\u2019')
    .ignoreMatchingQuotationMarks(
      // possessives and contractions
      new StringContextMatcher.Builder()
        .setCenterContent(/^['\u2019]$/)
        .setLeftContext(/\w$/)
        .setRightContext(/^\w/)
        .build(),
    )
    .ignoreMatchingQuotationMarks(
      // for possessives ending in "s", e.g. "Moses'"
      new StringContextMatcher.Builder()
        .setCenterContent(/^['\u2019]$/)
        .setLeftContext(/\ws$/)
        .setRightContext(/^[ \n,.:;]/)
        .build(),
    )
    .setNestingWarningDepth(QuotationDepth.fromNumber(4))
    .build();
  const quotationErrorFinder = new _privateTestingClasses.QuotationErrorFinder(
    defaultLocalizer,
    quotationConfig,
    stubDiagnosticFactory,
  );

  it('produces no errors for well-formed text', () => {
    const scriptureDocument: ScriptureDocument = documentFactory.create(
      'test-uri',
      'usfm',
      1,
      `\\id GEN
      \\toc3 Gen
      \\toc2 Genesis
      \\toc1 Genesis
      \\mt2 Book of
      \\mt1 Genesis
      \\c 1
      \\s Isaac and Rebekah
      \\p
      \\v 1 The servant said to him, “Perhaps the woman may not be willing to follow me to this land. Must I then take your son back to the land from which you came?”`,
    );

    expect(quotationErrorFinder.produceDiagnostics(scriptureDocument.getText())).toEqual([]);
  });

  it('identifies quotation errors in a single verse', () => {
    const scriptureDocument: ScriptureDocument = documentFactory.create(
      'test-uri',
      'usfm',
      1,
      `\\id GEN
      \\toc3 Gen
      \\toc2 Genesis
      \\toc1 Genesis
      \\mt2 Book of
      \\mt1 Genesis
      \\c 1
      \\s Isaac and Rebekah
      \\p
      \\v 1 The servant said to him, “Perhaps the woman may not be ‘willing to follow me to this land. Must I then take your son back to the land from which you came?”`,
    );

    expect(quotationErrorFinder.produceDiagnostics(scriptureDocument.getText())).toEqual([
      createUnmatchedOpeningQuoteDiagnostic(215, 216),
    ]);
  });

  it('identifies quotation errors that occur in non-verse portions', () => {
    const scriptureDocument: ScriptureDocument = documentFactory.create(
      'test-uri',
      'usfm',
      1,
      `\\id GEN
      \\toc3 “Gen
      \\toc2 Genesis”
      \\toc1 “Genesis
      \\mt2 Book of”
      \\mt1 “Genesis”
      \\c 1
      \\s “Isaac and Rebekah
      \\p
      \\v 1 The servant said to him, “Perhaps the woman may not be willing to follow me to this land. Must I then take your son back to the land from which you came?”`,
    );

    expect(quotationErrorFinder.produceDiagnostics(scriptureDocument.getText())).toEqual([
      createUnmatchedOpeningQuoteDiagnostic(128, 129),
      createIncorrectlyNestedDiagnostic(192, 193, QuotationDepth.Primary),
    ]);
  });

  it('produces no issues for well-formed quotes that span across verses', () => {
    const scriptureDocument: ScriptureDocument = documentFactory.create(
      'test-uri',
      'usfm',
      1,
      `\\id GEN
      \\toc3 Gen
      \\toc2 Genesis
      \\toc1 Genesis
      \\mt2 Book of
      \\mt1 Genesis
      \\c 1
      \\s Isaac and Rebekah
      \\p
      \v 1 Abraham said to him, “See to it that you do not take my son back there. 
      \v 2 The Lord, the God of heaven, who took me from my father's house and from the land of my kindred, and who spoke to me and swore to me, ‘To your offspring I will give this land’, he will send his angel before you, and you shall take a wife for my son from there. 
      \v 3 But if the woman is not willing to follow you, then you will be free from this oath of mine; only you must not take my son back there.”`,
    );

    expect(quotationErrorFinder.produceDiagnostics(scriptureDocument.getText())).toEqual([]);
  });
});
