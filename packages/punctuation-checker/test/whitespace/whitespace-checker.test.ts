import { DiagnosticSeverity, Localizer, TextDocument, TextDocumentFactory, TextEditFactory } from '@sillsdev/lynx';
import { describe, expect, it } from 'vitest';

import { StandardRuleSets } from '../../src';
import { ContextDirection } from '../../src/utils';
import { WhitespaceChecker } from '../../src/whitespace/whitespace-checker';
import { WhitespaceConfig } from '../../src/whitespace/whitespace-config';
import { StubTextDocumentManager } from '../test-utils';

describe('WhitespaceChecker tests', () => {
  it('produces DiagnosticFixes for whitespace issues', async () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();
    await testEnv.init();

    expect(
      await testEnv.whitespaceChecker.getDiagnosticFixes('No.space', {
        code: 'incorrect-trailing-whitespace',
        severity: DiagnosticSeverity.Warning,
        range: {
          start: {
            line: 0,
            character: 2,
          },
          end: {
            line: 0,
            character: 3,
          },
        },
        source: 'whitespace-checker',
        message: `The punctuation mark \u201C.\u201D should not be immediately followed by \u201Cs\u201D.`,
        data: {
          isSpaceAllowed: true,
        },
      }),
    ).toEqual([
      {
        title: `Add a space after this`,
        isPreferred: true,
        diagnostic: {
          code: 'incorrect-trailing-whitespace',
          severity: DiagnosticSeverity.Warning,
          range: {
            start: {
              line: 0,
              character: 2,
            },
            end: {
              line: 0,
              character: 3,
            },
          },
          source: 'whitespace-checker',
          message: `The punctuation mark \u201C.\u201D should not be immediately followed by \u201Cs\u201D.`,
          data: {
            isSpaceAllowed: true,
          },
        },
        edits: [
          {
            range: {
              start: {
                line: 0,
                character: 3,
              },
              end: {
                line: 0,
                character: 3,
              },
            },
            newText: ' ',
          },
        ],
      },
    ]);
  });

  it('gets its messages from the localizer', async () => {
    const customLocalizer: Localizer = new Localizer();
    customLocalizer.addNamespace('whitespace', (_language: string) => {
      return {
        diagnosticMessagesByCode: {
          'incorrect-leading-whitespace': "<--- There's supposed to be a space here",
          'incorrect-trailing-whitespace': 'Looks like you forgot something --->',
        },
      };
    });

    const testEnv: TestEnvironment =
      TestEnvironment.createWithStandardPairedPunctuationAndCustomLocalizer(customLocalizer);
    await testEnv.init();

    expect(await testEnv.whitespaceChecker.getDiagnostics('Errors(all)around')).toEqual([
      {
        code: 'incorrect-leading-whitespace',
        severity: DiagnosticSeverity.Warning,
        range: {
          start: {
            line: 0,
            character: 6,
          },
          end: {
            line: 0,
            character: 7,
          },
        },
        source: 'whitespace-checker',
        message: `<--- There's supposed to be a space here`,
        data: {
          isSpaceAllowed: true,
        },
      },
      {
        code: 'incorrect-trailing-whitespace',
        severity: DiagnosticSeverity.Warning,
        range: {
          start: {
            line: 0,
            character: 10,
          },
          end: {
            line: 0,
            character: 11,
          },
        },
        source: 'whitespace-checker',
        message: `Looks like you forgot something --->`,
        data: {
          isSpaceAllowed: true,
        },
      },
    ]);
  });

  it('uses the PairedPunctuationConfig that is passed to it', async () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithCustomWhitespace(
      new WhitespaceConfig.Builder().addRequiredWhitespaceRule(ContextDirection.Right, ['+'], [' ']).build(),
    );
    await testEnv.init();

    expect(await testEnv.whitespaceChecker.getDiagnostics('This should be+ correct')).toHaveLength(0);
    expect(await testEnv.whitespaceChecker.getDiagnostics('This should be +incorrect')).toHaveLength(1);
  });
});

class TestEnvironment {
  readonly whitespaceChecker: WhitespaceChecker<TextDocument>;

  private readonly whitespaceCheckerLocalizer: Localizer; // since QuotationChecker populates the localizer on its own

  constructor(
    private readonly whitespaceConfig: WhitespaceConfig,
    private readonly customLocalizer?: Localizer,
  ) {
    this.whitespaceCheckerLocalizer = new Localizer();

    const stubDocumentManager: StubTextDocumentManager = new StubTextDocumentManager(new TextDocumentFactory());
    this.whitespaceChecker = new WhitespaceChecker<TextDocument>(
      this.customLocalizer ?? this.whitespaceCheckerLocalizer,
      stubDocumentManager,
      new TextEditFactory(),
      this.whitespaceConfig,
    );
  }

  public async init(): Promise<void> {
    await this.whitespaceChecker.init();
    await this.whitespaceCheckerLocalizer.init();

    await this.customLocalizer?.init();
  }

  static createWithStandardPairedPunctuation(): TestEnvironment {
    return new TestEnvironment(StandardRuleSets.English._getWhitespaceConfig());
  }

  static createWithCustomWhitespace(whitespaceConfig: WhitespaceConfig): TestEnvironment {
    return new TestEnvironment(whitespaceConfig);
  }

  static createWithStandardPairedPunctuationAndCustomLocalizer(customLocalizer: Localizer): TestEnvironment {
    return new TestEnvironment(StandardRuleSets.English._getWhitespaceConfig(), customLocalizer);
  }
}
