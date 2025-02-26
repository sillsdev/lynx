import {
  Diagnostic,
  DiagnosticSeverity,
  DocumentManager,
  Localizer,
  TextDocument,
  TextDocumentFactory,
  TextEditFactory,
} from '@sillsdev/lynx';
import { describe, expect, it } from 'vitest';

import { QuotationChecker } from '../../src/quotation/quotation-checker';
import { QuotationConfig } from '../../src/quotation/quotation-config';
import { QuotationDepth } from '../../src/quotation/quotation-utils';
import { StringContextMatcher } from '../../src/utils';
import { StubTextDocumentManager } from '../test-utils';

describe('QuotationChecker tests', () => {
  it('provides DiagnosticFixes to remove the character for mismatched quotes', async () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithFullEnglishQuotes();
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
    const testEnv: TestEnvironment = TestEnvironment.createWithFullEnglishQuotes();
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
    const testEnv: TestEnvironment = TestEnvironment.createWithFullEnglishQuotes();
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
    const testEnv: TestEnvironment = TestEnvironment.createWithFullEnglishQuotes();
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

  it('uses the QuotationConfig that is passed to it', async () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithCustomQuotes(
      new QuotationConfig.Builder()
        .setTopLevelQuotationMarks({
          openingPunctuationMark: '/',
          closingPunctuationMark: '\\',
        })
        .addNestedQuotationMarks({
          openingPunctuationMark: '+',
          closingPunctuationMark: '-',
        })
        .build(),
    );
    await testEnv.init();

    expect(
      await testEnv.quotationChecker.getDiagnostics(
        '/It was the best of times, +it was the worst of times-, it was...\\',
      ),
    ).toHaveLength(0);
    expect(
      await testEnv.quotationChecker.getDiagnostics(
        '/It was the best of times, +it was the worst of times, it was...\\',
      ),
    ).toHaveLength(1);
  });
});

class TestEnvironment {
  readonly quotationChecker: QuotationChecker<TextDocument>;

  private readonly quotationCheckerLocalizer: Localizer; // since QuotationChecker populates the localizer on its own

  constructor(private readonly quotationConfig: QuotationConfig) {
    this.quotationCheckerLocalizer = new Localizer();

    const stubDocumentManager: DocumentManager<TextDocument> = new StubTextDocumentManager(new TextDocumentFactory());
    this.quotationChecker = new QuotationChecker(
      this.quotationCheckerLocalizer,
      stubDocumentManager,
      new TextEditFactory(),
      this.quotationConfig,
    );
  }

  public async init(): Promise<void> {
    await this.quotationChecker.init();
    await this.quotationCheckerLocalizer.init();
  }

  static createWithCustomQuotes(customQuotationConfig: QuotationConfig) {
    return new TestEnvironment(customQuotationConfig);
  }

  static createWithFullEnglishQuotes() {
    return new TestEnvironment(
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
