import { DiagnosticSeverity, Localizer, TextDocument, TextDocumentFactory, TextEditFactory } from '@sillsdev/lynx';
import { describe, expect, it } from 'vitest';

import { PairedPunctuationChecker } from '../../src/paired-punctuation/paired-punctuation-checker';
import { PairedPunctuationConfig } from '../../src/paired-punctuation/paired-punctuation-config';
import { StubTextDocumentManager } from '../test-utils';

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

    await expect(
      testEnv.pairedPunctuationChecker.getDiagnostics('The [rain in Spain falls mainly on the plain.'),
    ).resolves.toMatchObject([
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

    await expect(
      testEnv.pairedPunctuationChecker.getDiagnostics('The {rain in \u2018Spain} falls mainly\u2019 on the plain.'),
    ).resolves.toMatchObject([
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

    await expect(
      testEnv.pairedPunctuationChecker.getDiagnostics('The [rain in Spain falls mainly on the plain.'),
    ).resolves.toMatchObject([
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

    await expect(
      testEnv.pairedPunctuationChecker.getDiagnostics('The {rain in \u2018Spain} falls mainly\u2019 on the plain.'),
    ).resolves.toMatchObject([
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

  it('uses the PairedPunctuationConfig that is passed to it', async () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithCustomPairedPunctuation(
      new PairedPunctuationConfig.Builder()
        .addRule({
          openingPunctuationMark: '/',
          closingPunctuationMark: '\\',
        })
        .build(),
    );
    await testEnv.init();

    expect(
      await testEnv.pairedPunctuationChecker.getDiagnostics('The /rain in Spain\\ falls mainly on the plain.'),
    ).toHaveLength(0);
    expect(
      await testEnv.pairedPunctuationChecker.getDiagnostics('The \\rain in Spain/ falls mainly on the plain.'),
    ).toHaveLength(2);
  });
});

class TestEnvironment {
  readonly pairedPunctuationChecker: PairedPunctuationChecker<TextDocument>;

  private readonly pairedPunctuationCheckerLocalizer: Localizer; // since QuotationChecker populates the localizer on its own

  constructor(
    private readonly pairedPunctuationConfig: PairedPunctuationConfig,
    private readonly customLocalizer?: Localizer,
  ) {
    this.pairedPunctuationCheckerLocalizer = new Localizer();

    const stubDocumentManager: StubTextDocumentManager = new StubTextDocumentManager(new TextDocumentFactory());
    this.pairedPunctuationChecker = new PairedPunctuationChecker<TextDocument>(
      this.customLocalizer ?? this.pairedPunctuationCheckerLocalizer,
      stubDocumentManager,
      new TextEditFactory(),
      this.pairedPunctuationConfig,
    );
  }

  public async init(): Promise<void> {
    await this.pairedPunctuationChecker.init();
    await this.pairedPunctuationCheckerLocalizer.init();

    await this.customLocalizer?.init();
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

  static createWithCustomPairedPunctuation(pairedPunctuationConfig: PairedPunctuationConfig): TestEnvironment {
    return new TestEnvironment(pairedPunctuationConfig);
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
}
