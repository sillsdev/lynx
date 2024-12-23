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
import { QuotationChecker } from '../../src/quotation/quotation-checker';
import { QuotationConfig } from '../../src/quotation/quotation-config';
import { QuotationDepth } from '../../src/quotation/quotation-utils';
import { StringContextMatcher } from '../../src/utils';
import { StubSingleLineTextDocument, StubTextDocumentManager } from '../test-utils';

describe('QuotationChecker tests', () => {
  it('provides DiagnosticFixes to remove the character for mismatched quotes', async () => {
    const testEnv: TextTestEnvironment = TextTestEnvironment.createWithFullEnglishQuotes();
    await testEnv.init();

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

    expect(await testEnv.quotationChecker.getDiagnosticFixes('', unmatchedOpeningQuoteDiagnostic)).toEqual([
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

    expect(await testEnv.quotationChecker.getDiagnosticFixes('', unmatchedClosingQuoteDiagnostic)).toEqual([
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
    const testEnv: TextTestEnvironment = TextTestEnvironment.createWithFullEnglishQuotes();
    await testEnv.init();

    const incorrectlyNestedDiagnostic: Diagnostic = {
      code: 'incorrectly-nested-quotation-mark',
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
      data: {
        depth: 2,
      },
    };

    expect(await testEnv.quotationChecker.getDiagnosticFixes('', incorrectlyNestedDiagnostic)).toEqual([
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
        title: 'Replace this character with \u201C',
        isPreferred: true,
        diagnostic: incorrectlyNestedDiagnostic,
        edits: [
          {
            range: incorrectlyNestedDiagnostic.range,
            newText: '\u201C',
          },
        ],
      },
    ]);
  });

  it('provides DiagnosticFixes to replace the character for ambiguous quotes', async () => {
    const testEnv: TextTestEnvironment = TextTestEnvironment.createWithFullEnglishQuotes();
    await testEnv.init();

    const ambiguousDiagnostic: Diagnostic = {
      code: 'ambiguous-quotation-mark',
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
      data: {
        existingQuotationMark: '"',
        correctedQuotationMark: '\u201C',
      },
    };

    expect(await testEnv.quotationChecker.getDiagnosticFixes('', ambiguousDiagnostic)).toEqual([
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
    const testEnv: TextTestEnvironment = TextTestEnvironment.createWithFullEnglishQuotes();
    await testEnv.init();

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

    expect(await testEnv.quotationChecker.getDiagnosticFixes('', tooDeeplyNestedDiagnostic)).toEqual([]);
  });
});

class TextTestEnvironment {
  readonly quotationChecker: QuotationChecker;

  private readonly quotationCheckerLocalizer: Localizer; // since QuotationChecker populates the localizer on its own

  constructor(private readonly quotationConfig: QuotationConfig) {
    this.quotationCheckerLocalizer = new Localizer();

    const stubDocumentManager: DocumentManager<TextDocument> = new StubTextDocumentManager(new TextDocumentFactory());
    this.quotationChecker = new QuotationChecker(
      this.quotationCheckerLocalizer,
      stubDocumentManager,
      this.quotationConfig,
    );
  }

  public async init(): Promise<void> {
    await this.quotationChecker.init();
    await this.quotationCheckerLocalizer.init();
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
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class ScriptureTestEnvironment {
  readonly quotationChecker: QuotationChecker;

  private readonly quotationCheckerLocalizer: Localizer; // since QuotationChecker populates the localizer on its own

  private readonly scriptureDocumentFactory: UsfmDocumentFactory;

  constructor(private readonly quotationConfig: QuotationConfig) {
    this.quotationCheckerLocalizer = new Localizer();

    const stubDocumentManager: DocumentManager<TextDocument> = new StubTextDocumentManager(new TextDocumentFactory());
    this.quotationChecker = new QuotationChecker(this.quotationCheckerLocalizer, stubDocumentManager, quotationConfig);

    const stylesheet = new UsfmStylesheet('usfm.sty');
    this.scriptureDocumentFactory = new UsfmDocumentFactory(stylesheet);
  }

  public async init(): Promise<void> {
    await this.quotationChecker.init();
    await this.quotationCheckerLocalizer.init();
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

  createScriptureDocument(usfm: string): ScriptureDocument {
    return this.scriptureDocumentFactory.create('test-uri', 'usfm', 1, usfm);
  }
}
