import { DiagnosticSeverity, Localizer, TextDocument, TextDocumentFactory, TextEditFactory } from '@sillsdev/lynx';
import { describe, expect, it } from 'vitest';

import { StandardRuleSets } from '../../src';
import { PunctuationContextChecker } from '../../src/punctuation-context/punctuation-context-checker';
import { PunctuationContextConfig } from '../../src/punctuation-context/punctuation-context-config';
import { ContextDirection } from '../../src/utils';
import { StubTextDocumentManager } from '../test-utils';

describe('PunctuationContextChecker tests', () => {
  it('produces DiagnosticFixes for punctuation context issues', async () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();
    await testEnv.init();

    expect(
      await testEnv.punctuationContextChecker.getDiagnosticFixes('No.space', {
        code: 'incorrect-trailing-context',
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
        source: 'punctuation-context-checker',
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
          code: 'incorrect-trailing-context',
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
          source: 'punctuation-context-checker',
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

    expect(
      await testEnv.punctuationContextChecker.getDiagnosticFixes('No(space', {
        code: 'incorrect-leading-context',
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
        source: 'punctuation-context-checker',
        message: `The punctuation mark \u201C.\u201D should not be immediately preceded by \u201Cs\u201D.`,
        data: {
          isSpaceAllowed: true,
        },
      }),
    ).toEqual([
      {
        title: `Add a space before this`,
        isPreferred: true,
        diagnostic: {
          code: 'incorrect-leading-context',
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
          source: 'punctuation-context-checker',
          message: `The punctuation mark \u201C.\u201D should not be immediately preceded by \u201Cs\u201D.`,
          data: {
            isSpaceAllowed: true,
          },
        },
        edits: [
          {
            range: {
              start: {
                line: 0,
                character: 2,
              },
              end: {
                line: 0,
                character: 2,
              },
            },
            newText: ' ',
          },
        ],
      },
    ]);
  });

  it('does not provide any DiagnosticFixes when the insertion of a space would not fix the problem', async () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithCustomConfig(
      new PunctuationContextConfig.Builder()
        .addAcceptableContextCharacters(ContextDirection.Right, ['+'], ['t'])
        .build(),
    );
    await testEnv.init();

    expect(
      await testEnv.punctuationContextChecker.getDiagnosticFixes('No+space', {
        code: 'incorrect-trailing-context',
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
        source: 'punctuation-context-checker',
        message: `The punctuation mark \u201C+\u201D should not be immediately followed by \u201Cs\u201D.`,
        data: {
          isSpaceAllowed: false,
        },
      }),
    ).toEqual([]);
  });

  it('gets its messages from the localizer', async () => {
    const customLocalizer: Localizer = new Localizer();
    customLocalizer.addNamespace('punctuation-context', (_language: string) => {
      return {
        diagnosticMessagesByCode: {
          'incorrect-leading-context': "<--- There's supposed to be a space here",
          'incorrect-trailing-context': 'Looks like you forgot something --->',
        },
      };
    });

    const testEnv: TestEnvironment = TestEnvironment.createWithStandardContextRulesAndCustomLocalizer(customLocalizer);
    await testEnv.init();

    expect(await testEnv.punctuationContextChecker.getDiagnostics('Errors(all)around')).toEqual([
      {
        code: 'incorrect-leading-context',
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
        source: 'punctuation-context-checker',
        message: `<--- There's supposed to be a space here`,
        data: {
          isSpaceAllowed: true,
        },
      },
      {
        code: 'incorrect-trailing-context',
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
        source: 'punctuation-context-checker',
        message: `Looks like you forgot something --->`,
        data: {
          isSpaceAllowed: true,
        },
      },
    ]);
  });

  it('uses the PairedPunctuationConfig that is passed to it', async () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithCustomConfig(
      new PunctuationContextConfig.Builder()
        .addAcceptableContextCharacters(ContextDirection.Right, ['+'], [' '])
        .build(),
    );
    await testEnv.init();

    expect(await testEnv.punctuationContextChecker.getDiagnostics('This should be+ correct')).toHaveLength(0);
    expect(await testEnv.punctuationContextChecker.getDiagnostics('This should be +incorrect')).toHaveLength(1);
  });
});

class TestEnvironment {
  readonly punctuationContextChecker: PunctuationContextChecker<TextDocument>;

  private readonly punctuationContextCheckerLocalizer: Localizer; // since QuotationChecker populates the localizer on its own

  constructor(
    private readonly punctuationContextConfig: PunctuationContextConfig,
    private readonly customLocalizer?: Localizer,
  ) {
    this.punctuationContextCheckerLocalizer = new Localizer();

    const stubDocumentManager: StubTextDocumentManager = new StubTextDocumentManager(new TextDocumentFactory());
    this.punctuationContextChecker = new PunctuationContextChecker<TextDocument>(
      this.customLocalizer ?? this.punctuationContextCheckerLocalizer,
      stubDocumentManager,
      new TextEditFactory(),
      this.punctuationContextConfig,
    );
  }

  public async init(): Promise<void> {
    await this.punctuationContextChecker.init();
    await this.punctuationContextCheckerLocalizer.init();

    await this.customLocalizer?.init();
  }

  static createWithStandardPairedPunctuation(): TestEnvironment {
    return new TestEnvironment(StandardRuleSets.English._getPunctuationContextConfig());
  }

  static createWithCustomConfig(punctuationContextConfig: PunctuationContextConfig): TestEnvironment {
    return new TestEnvironment(punctuationContextConfig);
  }

  static createWithStandardContextRulesAndCustomLocalizer(customLocalizer: Localizer): TestEnvironment {
    return new TestEnvironment(StandardRuleSets.English._getPunctuationContextConfig(), customLocalizer);
  }
}
