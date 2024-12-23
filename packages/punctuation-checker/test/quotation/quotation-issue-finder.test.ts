import { Diagnostic, DiagnosticSeverity, Localizer, ScriptureDocument } from '@sillsdev/lynx';
import { UsfmDocumentFactory } from '@sillsdev/lynx-usfm';
import { UsfmStylesheet } from '@sillsdev/machine/corpora';
import { describe, expect, it } from 'vitest';

import { DiagnosticFactory } from '../../src/diagnostic-factory';
import { QuotationConfig } from '../../src/quotation/quotation-config';
import { QuotationIssueFinder } from '../../src/quotation/quotation-issue-finder';
import { QuotationDepth, QuotationRootLevel } from '../../src/quotation/quotation-utils';
import { StringContextMatcher } from '../../src/utils';
import { StubSingleLineTextDocument } from '../test-utils';

describe('QuotationErrorFinder tests', () => {
  it('keeps no internal state', async () => {
    const testEnv: TextTestEnvironment = TextTestEnvironment.createWithTopLevelQuotes();
    await testEnv.init();

    expect(testEnv.quotationErrorFinder.produceDiagnostics('Sample text \u201Dwith more text')).toEqual([
      testEnv.createUnmatchedClosingQuoteDiagnostic(12, 13),
    ]);
    expect(testEnv.quotationErrorFinder.produceDiagnostics('Sample text \u201Dwith more text')).toEqual([
      testEnv.createUnmatchedClosingQuoteDiagnostic(12, 13),
    ]);
    expect(testEnv.quotationErrorFinder.produceDiagnostics('Sample text with no quote')).toEqual([]);
  });

  describe('For standard English top-level quotes', () => {
    it('creates Diagnostics for unmatched quotation marks', async () => {
      const testEnv: TextTestEnvironment = TextTestEnvironment.createWithTopLevelQuotes();
      await testEnv.init();

      expect(testEnv.quotationErrorFinder.produceDiagnostics('Sample text \u201Cwith more text')).toEqual([
        testEnv.createUnmatchedOpeningQuoteDiagnostic(12, 13),
      ]);
      expect(testEnv.quotationErrorFinder.produceDiagnostics('Sample text \u201Dwith more text')).toEqual([
        testEnv.createUnmatchedClosingQuoteDiagnostic(12, 13),
      ]);
      expect(testEnv.quotationErrorFinder.produceDiagnostics('\u201CSample text\u201D \u201Cwith more text')).toEqual([
        testEnv.createUnmatchedOpeningQuoteDiagnostic(14, 15),
      ]);
      expect(testEnv.quotationErrorFinder.produceDiagnostics('\u201CSample text\u201D \u201Dwith more text')).toEqual([
        testEnv.createUnmatchedClosingQuoteDiagnostic(14, 15),
      ]);
    });

    it('creates Diagnostics for incorrectly nested quotation marks', async () => {
      const testEnv: TextTestEnvironment = TextTestEnvironment.createWithTopLevelQuotes();
      await testEnv.init();

      expect(testEnv.quotationErrorFinder.produceDiagnostics('\u201CSample text \u201Cwith more text\u201D')).toEqual([
        testEnv.createUnmatchedOpeningQuoteDiagnostic(0, 1),
        testEnv.createIncorrectlyNestedDiagnostic(13, 14, QuotationDepth.Primary),
      ]);
    });

    it('creates Diagnostics for ambiguous quotation marks', async () => {
      const testEnv: TextTestEnvironment = TextTestEnvironment.createWithTopLevelQuotes();
      await testEnv.init();

      expect(testEnv.quotationErrorFinder.produceDiagnostics('"Sample text"')).toEqual([
        testEnv.createAmbiguousDiagnostic(0, 1, '"', '\u201C'),
        testEnv.createAmbiguousDiagnostic(12, 13, '"', '\u201D'),
      ]);
    });
  });

  describe('For multi-level English quotes', () => {
    it('creates Diagnostics for unmatched opening quotation marks', async () => {
      const testEnv: TextTestEnvironment = TextTestEnvironment.createWithFullEnglishQuotes();
      await testEnv.init();

      expect(testEnv.quotationErrorFinder.produceDiagnostics('\u201CSample text \u201Cwith more text\u201D')).toEqual([
        testEnv.createUnmatchedOpeningQuoteDiagnostic(0, 1),
        testEnv.createIncorrectlyNestedDiagnostic(13, 14, QuotationDepth.fromNumber(1)),
      ]);

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics('\u201CThis contains two \u2018levels of unclosed quotes'),
      ).toEqual([
        testEnv.createUnmatchedOpeningQuoteDiagnostic(0, 1),
        testEnv.createUnmatchedOpeningQuoteDiagnostic(19, 20),
      ]);

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics(
          '\u201CThis contains an \u2018unclosed second level quote\u201D',
        ),
      ).toEqual([testEnv.createUnmatchedOpeningQuoteDiagnostic(18, 19)]);

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics(
          '\u201CThis contains three \u2018levels of unclosed \u201Cquotes',
        ),
      ).toEqual([
        testEnv.createUnmatchedOpeningQuoteDiagnostic(0, 1),
        testEnv.createUnmatchedOpeningQuoteDiagnostic(21, 22),
        testEnv.createUnmatchedOpeningQuoteDiagnostic(41, 42),
      ]);

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics(
          '\u201CThis contains two \u2018levels of unclosed \u201Cquotes\u201D',
        ),
      ).toEqual([
        testEnv.createUnmatchedOpeningQuoteDiagnostic(0, 1),
        testEnv.createUnmatchedOpeningQuoteDiagnostic(19, 20),
      ]);

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics(
          '\u201CThis contains one \u2018level of unclosed \u201Cquotes\u201D\u2019',
        ),
      ).toEqual([testEnv.createUnmatchedOpeningQuoteDiagnostic(0, 1)]);

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics('\u201CThis contains a nested \u2018unclosed quote\u201D'),
      ).toEqual([testEnv.createUnmatchedOpeningQuoteDiagnostic(24, 25)]);

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics('"This has an \u2018ambiguous unclosed\u2019 quote'),
      ).toEqual([
        testEnv.createUnmatchedOpeningQuoteDiagnostic(0, 1),
        testEnv.createAmbiguousDiagnostic(0, 1, '"', '\u201C'),
      ]);

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics("\u201CThis has an 'ambiguous unclosed quote\u201D"),
      ).toEqual([
        testEnv.createUnmatchedOpeningQuoteDiagnostic(13, 14),
        testEnv.createAmbiguousDiagnostic(13, 14, "'", '\u2018'),
      ]);

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics('\u201CThis text has an ambiguous\u201D unpaired" quote'),
      ).toEqual([
        testEnv.createUnmatchedOpeningQuoteDiagnostic(37, 38),
        testEnv.createAmbiguousDiagnostic(37, 38, '"', '\u201C'),
      ]);

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics("\u201CThis text has an ambiguous\u201D unpaired' quote"),
      ).toEqual([
        testEnv.createUnmatchedOpeningQuoteDiagnostic(37, 38),
        testEnv.createIncorrectlyNestedDiagnostic(37, 38, new QuotationRootLevel()),
        testEnv.createAmbiguousDiagnostic(37, 38, "'", '\u2018'),
      ]);
    });

    it('creates Diagnostics for unmatched closing quotation marks', async () => {
      const testEnv: TextTestEnvironment = TextTestEnvironment.createWithFullEnglishQuotes();
      await testEnv.init();

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics('Text with an \u2018unpaired\u2019 closing quote\u201D'),
      ).toEqual([
        testEnv.createUnmatchedClosingQuoteDiagnostic(37, 38),
        testEnv.createIncorrectlyNestedDiagnostic(13, 14, new QuotationRootLevel()),
      ]);

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics('\u201CText with an unpaired\u2019 closing quote\u201D'),
      ).toEqual([testEnv.createUnmatchedClosingQuoteDiagnostic(22, 23)]);

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics('This text has multiple\u2019 unpaired quotes\u201D'),
      ).toEqual([
        testEnv.createUnmatchedClosingQuoteDiagnostic(22, 23),
        testEnv.createUnmatchedClosingQuoteDiagnostic(39, 40),
      ]);

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics(
          '\u201CThis text has multiple\u201D unpaired\u2019 quotes\u201D',
        ),
      ).toEqual([
        testEnv.createUnmatchedClosingQuoteDiagnostic(33, 34),
        testEnv.createUnmatchedClosingQuoteDiagnostic(41, 42),
      ]);
    });

    it('creates Diagnostics for incorrectly nested quotation marks', async () => {
      const testEnv: TextTestEnvironment = TextTestEnvironment.createWithFullEnglishQuotes();
      await testEnv.init();

      expect(testEnv.quotationErrorFinder.produceDiagnostics('\u2018\u2019')).toEqual([
        testEnv.createIncorrectlyNestedDiagnostic(0, 1, new QuotationRootLevel()),
      ]);

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics(
          '\u201CThis text has a \u2018secondary quote \u2018opening inside a secondary quote\u2019\u2019\u201D',
        ),
      ).toEqual([
        testEnv.createIncorrectlyNestedDiagnostic(34, 35, QuotationDepth.fromNumber(2)),
        testEnv.createTooDeeplyNestedDiagnostic(34, 35),
        testEnv.createTooDeeplyNestedDiagnostic(67, 68),
      ]);

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics(
          '\u201CThis text has a \u2018tertiary quote \u201Copening \u201Cinside a tertiary quote\u201D\u201D\u2019\u201D',
        ),
      ).toEqual([testEnv.createIncorrectlyNestedDiagnostic(42, 43, QuotationDepth.fromNumber(3))]);

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics(
          "\u201CThis text has a 'secondary quote \u2018opening inside a secondary quote\u2019\u2019\u201D",
        ),
      ).toEqual([
        testEnv.createIncorrectlyNestedDiagnostic(34, 35, QuotationDepth.fromNumber(2)),
        testEnv.createAmbiguousDiagnostic(17, 18, "'", '\u2018'),
        testEnv.createTooDeeplyNestedDiagnostic(34, 35),
        testEnv.createTooDeeplyNestedDiagnostic(67, 68),
      ]);
    });

    it('creates Diagnostics for ambiguous quotation marks', async () => {
      const testEnv: TextTestEnvironment = TextTestEnvironment.createWithFullEnglishQuotes();
      await testEnv.init();

      expect(testEnv.quotationErrorFinder.produceDiagnostics("\u201CSample 'text'\u201D")).toEqual([
        testEnv.createAmbiguousDiagnostic(8, 9, "'", '\u2018'),
        testEnv.createAmbiguousDiagnostic(13, 14, "'", '\u2019'),
      ]);

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics(
          '\u201CSample \u2018text with an "ambiguous" third level quote\u2019\u201D',
        ),
      ).toEqual([
        testEnv.createAmbiguousDiagnostic(22, 23, '"', '\u201C'),
        testEnv.createAmbiguousDiagnostic(32, 33, '"', '\u201D'),
      ]);

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics('\u201CText with \'mixed\u2019 ambiguous quotes"'),
      ).toEqual([
        testEnv.createAmbiguousDiagnostic(11, 12, "'", '\u2018'),
        testEnv.createAmbiguousDiagnostic(35, 36, '"', '\u201D'),
      ]);
    });

    it('creates Diagnostics for quotation marks that are too deeply nested', async () => {
      const testEnv: TextTestEnvironment = TextTestEnvironment.createWithFullEnglishQuotes();
      await testEnv.init();

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics(
          '\u201CThis \u2018has \u201Cfour \u2018level\u2019 of\u201D quotes\u2019\u201D',
        ),
      ).toEqual([testEnv.createTooDeeplyNestedDiagnostic(17, 18), testEnv.createTooDeeplyNestedDiagnostic(23, 24)]);

      expect(testEnv.quotationErrorFinder.produceDiagnostics('"This \'has "four \'level\' of" quotes\'"')).toEqual([
        testEnv.createAmbiguousDiagnostic(0, 1, '"', '\u201C'),
        testEnv.createAmbiguousDiagnostic(6, 7, "'", '\u2018'),
        testEnv.createAmbiguousDiagnostic(11, 12, '"', '\u201C'),
        testEnv.createAmbiguousDiagnostic(17, 18, "'", '\u2018'),
        testEnv.createAmbiguousDiagnostic(23, 24, "'", '\u2019'),
        testEnv.createAmbiguousDiagnostic(27, 28, '"', '\u201D'),
        testEnv.createAmbiguousDiagnostic(35, 36, "'", '\u2019'),
        testEnv.createAmbiguousDiagnostic(36, 37, '"', '\u201D'),
        testEnv.createTooDeeplyNestedDiagnostic(17, 18),
        testEnv.createTooDeeplyNestedDiagnostic(23, 24),
      ]);
    });
  });

  describe('For a system with different 1st- and 3rd-level quotes', () => {
    it('creates Diagnostics for unmatched opening quotation marks', async () => {
      const testEnv: TextTestEnvironment = TextTestEnvironment.createWithDifferentThirdLevelQuotes();
      await testEnv.init();

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics(
          '\u201CThis text has a \u2018primary \u201Equote\u201D closing inside a tertiary quote',
        ),
      ).toEqual([
        testEnv.createUnmatchedOpeningQuoteDiagnostic(26, 27),
        testEnv.createUnmatchedOpeningQuoteDiagnostic(17, 18),
      ]);

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics(
          '\u201CThis text has a \u2018primary \u201Equote\u2019 closing inside a tertiary quote\u201D',
        ),
      ).toEqual([testEnv.createUnmatchedOpeningQuoteDiagnostic(26, 27)]);
    });

    it('creates Diagnostics for unmatched closing quotation marks', async () => {
      const testEnv: TextTestEnvironment = TextTestEnvironment.createWithDifferentThirdLevelQuotes();
      await testEnv.init();

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics(
          '\u201CText \u2018with an unpaired\u201F\u2019 closing quote\u201D',
        ),
      ).toEqual([testEnv.createUnmatchedClosingQuoteDiagnostic(23, 24)]);

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics(
          '\u201CThis text has a\u2019 secondary quote closing inside a primary quote\u201D',
        ),
      ).toEqual([testEnv.createUnmatchedClosingQuoteDiagnostic(16, 17)]);

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics(
          '\u201CThis text has a\u2018 tertiary quote\u201F closing inside a secondary quote\u2019\u201D',
        ),
      ).toEqual([testEnv.createUnmatchedClosingQuoteDiagnostic(32, 33)]);

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics(
          '\u201CThis text has a tertiary quote\u201F closing inside a primary quote\u201D',
        ),
      ).toEqual([testEnv.createUnmatchedClosingQuoteDiagnostic(31, 32)]);
    });

    it('creates Diagnostics for incorrectly nested quotation marks', async () => {
      const testEnv: TextTestEnvironment = TextTestEnvironment.createWithDifferentThirdLevelQuotes();
      await testEnv.init();

      expect(testEnv.quotationErrorFinder.produceDiagnostics('\u201E\u201F')).toEqual([
        testEnv.createIncorrectlyNestedDiagnostic(0, 1, new QuotationRootLevel()),
      ]);

      expect(testEnv.quotationErrorFinder.produceDiagnostics('\u201C\u201E\u201F\u201D')).toEqual([
        testEnv.createIncorrectlyNestedDiagnostic(1, 2, QuotationDepth.fromNumber(1)),
      ]);

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics(
          '\u201CThis text has a \u201Etertiary quote opening in a primary context\u201F\u201D',
        ),
      ).toEqual([testEnv.createIncorrectlyNestedDiagnostic(17, 18, QuotationDepth.fromNumber(1))]);

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics(
          '\u201CThis text \u2018contains a \u201Esecond-level \u2018quote\u2019 inside a third-level quote\u201F\u2019\u201D',
        ),
      ).toEqual([testEnv.createIncorrectlyNestedDiagnostic(37, 38, QuotationDepth.fromNumber(3))]);

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics(
          '\u201CThis text \u2018contains a \u201Efirst-level \u201Cquote\u201D inside a third-level quote\u201F\u2019\u201D',
        ),
      ).toEqual([testEnv.createIncorrectlyNestedDiagnostic(36, 37, QuotationDepth.fromNumber(3))]);

      expect(
        testEnv.quotationErrorFinder.produceDiagnostics(
          '\u201CThis text \u2018contains a first-level \u201Cquote\u201D inside a second-level quote\u2019\u201D',
        ),
      ).toEqual([testEnv.createIncorrectlyNestedDiagnostic(35, 36, QuotationDepth.fromNumber(2))]);
    });
  });
});

describe('ScriptureDocument tests', () => {
  it('produces no errors for well-formed text', async () => {
    const testEnv: ScriptureTestEnvironment = ScriptureTestEnvironment.createWithFullEnglishQuotes();
    await testEnv.init();

    const scriptureDocument: ScriptureDocument = testEnv.createScriptureDocument(
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

    expect(testEnv.quotationErrorFinder.produceDiagnostics(scriptureDocument.getText())).toEqual([]);
  });

  it('identifies quotation errors in a single verse', async () => {
    const testEnv: ScriptureTestEnvironment = ScriptureTestEnvironment.createWithFullEnglishQuotes();
    await testEnv.init();

    const scriptureDocument: ScriptureDocument = testEnv.createScriptureDocument(
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

    expect(testEnv.quotationErrorFinder.produceDiagnostics(scriptureDocument.getText())).toEqual([
      testEnv.createUnmatchedOpeningQuoteDiagnostic(215, 216),
    ]);
  });

  it('identifies quotation errors that occur in non-verse portions', async () => {
    const testEnv: ScriptureTestEnvironment = ScriptureTestEnvironment.createWithFullEnglishQuotes();
    await testEnv.init();

    const scriptureDocument: ScriptureDocument = testEnv.createScriptureDocument(
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

    expect(testEnv.quotationErrorFinder.produceDiagnostics(scriptureDocument.getText())).toEqual([
      testEnv.createUnmatchedOpeningQuoteDiagnostic(128, 129),
      testEnv.createIncorrectlyNestedDiagnostic(192, 193, QuotationDepth.Primary),
    ]);
  });

  it('produces no issues for well-formed quotes that span across verses', async () => {
    const testEnv: ScriptureTestEnvironment = ScriptureTestEnvironment.createWithFullEnglishQuotes();
    await testEnv.init();

    const scriptureDocument: ScriptureDocument = testEnv.createScriptureDocument(
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

    expect(testEnv.quotationErrorFinder.produceDiagnostics(scriptureDocument.getText())).toEqual([]);
  });
});

class TextTestEnvironment {
  readonly quotationErrorFinder;

  private readonly quotationErrorFinderLocalizer: Localizer; // we have separate localizers for the two classes

  constructor(private readonly quotationConfig: QuotationConfig) {
    this.quotationErrorFinderLocalizer = this.createDefaultLocalizer();
    const stubDiagnosticFactory = this.createStubDiagnosticFactory();

    this.quotationErrorFinder = new QuotationIssueFinder(
      this.quotationErrorFinderLocalizer,
      this.quotationConfig,
      stubDiagnosticFactory,
    );
  }

  public async init(): Promise<void> {
    await this.quotationErrorFinderLocalizer.init();
  }

  private createDefaultLocalizer(): Localizer {
    const defaultLocalizer: Localizer = new Localizer();
    defaultLocalizer.addNamespace('quotation', (_language: string) => {
      return {
        diagnosticMessagesByCode: {
          'unmatched-opening-quotation-mark': 'Opening quotation mark with no closing mark.',
          'unmatched-closing-quotation-mark': 'Closing quotation mark with no opening mark.',
          'incorrectly-nested-quotation-mark': 'Incorrectly nested quotation mark.',
          'ambiguous-quotation-mark': 'This quotation mark is ambiguous.',
          'deeply-nested-quotation-mark': 'Too many levels of quotation marks. Consider rephrasing to avoid this.',
        },
      };
    });
    return defaultLocalizer;
  }

  private createStubDiagnosticFactory(): DiagnosticFactory {
    return new DiagnosticFactory(
      'quotation-mark-checker',
      new StubSingleLineTextDocument(''), // passing an empty document is fine here since we don't use getText()
    );
  }

  static createWithTopLevelQuotes() {
    return new TextTestEnvironment(
      new QuotationConfig.Builder()
        .setTopLevelQuotationMarks({
          openingPunctuationMark: '\u201C',
          closingPunctuationMark: '\u201D',
        })
        .mapAmbiguousQuotationMark('"', '\u201C')
        .mapAmbiguousQuotationMark('"', '\u201D')
        .build(),
    );
  }

  static createWithFullEnglishQuotes() {
    return new TextTestEnvironment(
      new QuotationConfig.Builder()
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
        .build(),
    );
  }

  static createWithDifferentThirdLevelQuotes() {
    return new TextTestEnvironment(
      new QuotationConfig.Builder()
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
        .build(),
    );
  }

  createUnmatchedOpeningQuoteDiagnostic(startOffset: number, endOffset: number): Diagnostic {
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

  createUnmatchedClosingQuoteDiagnostic(startOffset: number, endOffset: number): Diagnostic {
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

  createIncorrectlyNestedDiagnostic(startOffset: number, endOffset: number, parentDepth: QuotationDepth): Diagnostic {
    return {
      code: 'incorrectly-nested-quotation-mark',
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
      data: {
        depth: parentDepth.asNumber(),
      },
    };
  }

  createAmbiguousDiagnostic(
    startOffset: number,
    endOffset: number,
    ambiguousMark: string,
    unambiguousMark: string,
  ): Diagnostic {
    return {
      code: 'ambiguous-quotation-mark',
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
      data: {
        existingQuotationMark: ambiguousMark,
        correctedQuotationMark: unambiguousMark,
      },
    };
  }

  createTooDeeplyNestedDiagnostic(startOffset: number, endOffset: number): Diagnostic {
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
}

class ScriptureTestEnvironment {
  readonly quotationErrorFinder;
  private readonly quotationErrorFinderLocalizer: Localizer; // we have separate localizers for the two classes

  private readonly scriptureDocumentFactory: UsfmDocumentFactory;

  constructor(private readonly quotationConfig: QuotationConfig) {
    this.quotationErrorFinderLocalizer = this.createDefaultLocalizer();
    const stubDiagnosticFactory = this.createStubDiagnosticFactory();

    this.quotationErrorFinder = new QuotationIssueFinder(
      this.quotationErrorFinderLocalizer,
      this.quotationConfig,
      stubDiagnosticFactory,
    );

    const stylesheet = new UsfmStylesheet('usfm.sty');
    this.scriptureDocumentFactory = new UsfmDocumentFactory(stylesheet);
  }

  public async init(): Promise<void> {
    await this.quotationErrorFinderLocalizer.init();
  }

  private createDefaultLocalizer(): Localizer {
    const defaultLocalizer: Localizer = new Localizer();
    defaultLocalizer.addNamespace('quotation', (_language: string) => {
      return {
        diagnosticMessagesByCode: {
          'unmatched-opening-quotation-mark': 'Opening quotation mark with no closing mark.',
          'unmatched-closing-quotation-mark': 'Closing quotation mark with no opening mark.',
          'incorrectly-nested-quotation-mark': 'Incorrectly nested quotation mark.',
          'ambiguous-quotation-mark': 'This quotation mark is ambiguous.',
          'deeply-nested-quotation-mark': 'Too many levels of quotation marks. Consider rephrasing to avoid this.',
        },
      };
    });
    return defaultLocalizer;
  }

  private createStubDiagnosticFactory(): DiagnosticFactory {
    return new DiagnosticFactory(
      'quotation-mark-checker',
      new StubSingleLineTextDocument(''), // passing an empty document is fine here since we don't use getText()
    );
  }

  static createWithTopLevelQuotes() {
    return new ScriptureTestEnvironment(
      new QuotationConfig.Builder()
        .setTopLevelQuotationMarks({
          openingPunctuationMark: '\u201C',
          closingPunctuationMark: '\u201D',
        })
        .mapAmbiguousQuotationMark('"', '\u201C')
        .mapAmbiguousQuotationMark('"', '\u201D')
        .build(),
    );
  }

  static createWithFullEnglishQuotes() {
    return new ScriptureTestEnvironment(
      new QuotationConfig.Builder()
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
        .build(),
    );
  }

  static createWithDifferentThirdLevelQuotes() {
    return new ScriptureTestEnvironment(
      new QuotationConfig.Builder()
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
        .build(),
    );
  }

  createUnmatchedOpeningQuoteDiagnostic(startOffset: number, endOffset: number): Diagnostic {
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

  createUnmatchedClosingQuoteDiagnostic(startOffset: number, endOffset: number): Diagnostic {
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

  createIncorrectlyNestedDiagnostic(startOffset: number, endOffset: number, parentDepth: QuotationDepth): Diagnostic {
    return {
      code: 'incorrectly-nested-quotation-mark',
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
      data: {
        depth: parentDepth.asNumber(),
      },
    };
  }

  createAmbiguousDiagnostic(
    startOffset: number,
    endOffset: number,
    ambiguousMark: string,
    unambiguousMark: string,
  ): Diagnostic {
    return {
      code: 'ambiguous-quotation-mark',
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
      data: {
        existingQuotationMark: ambiguousMark,
        correctedQuotationMark: unambiguousMark,
      },
    };
  }

  createTooDeeplyNestedDiagnostic(startOffset: number, endOffset: number): Diagnostic {
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

  createScriptureDocument(usfm: string): ScriptureDocument {
    return this.scriptureDocumentFactory.create('test-uri', 'usfm', 1, usfm);
  }
}
