import { Diagnostic, DiagnosticSeverity, Localizer, ScriptureNode, ScriptureText } from '@sillsdev/lynx';
import { describe, expect, it } from 'vitest';

import { DiagnosticFactory } from '../../src/diagnostic-factory';
import { ContextDirection, ScriptureNodeGroup } from '../../src/utils';
import { WhitespaceConfig } from '../../src/whitespace/whitespace-config';
import type { WhitespaceIssueFinder } from '../../src/whitespace/whitespace-issue-finder';
import { WhitespaceIssueFinderFactory } from '../../src/whitespace/whitespace-issue-finder';
import { StubFixedLineWidthTextDocument, StubSingleLineTextDocument } from '../test-utils';

describe('Tests with plain-text strings', () => {
  it('produces no Diagnostics for text with well-formed whitespace', async () => {
    const testEnv: TextTestEnvironment = TextTestEnvironment.createWithStandardWhitespace();
    await testEnv.init();

    expect(testEnv.whitespaceIssueFinder.produceDiagnostics('end of sentence. start of next')).toEqual([]);
    expect(testEnv.whitespaceIssueFinder.produceDiagnostics('spaces (on both sides) of parentheses')).toEqual([]);
    expect(testEnv.whitespaceIssueFinder.produceDiagnostics('this contains: colons; semicolons, and commas')).toEqual(
      [],
    );
  });

  it('produces Diagnostics for text with missing required whitespace', async () => {
    const testEnv: TextTestEnvironment = TextTestEnvironment.createWithStandardWhitespace();
    await testEnv.init();

    expect(testEnv.whitespaceIssueFinder.produceDiagnostics('no space after.period')).toEqual([
      testEnv.createExpectedTrailingWhitespaceDiagnostic(14, 15),
    ]);
    expect(testEnv.whitespaceIssueFinder.produceDiagnostics('no space(before parenthesis')).toEqual([
      testEnv.createExpectedLeadingWhitespaceDiagnostic(8, 9),
    ]);
  });

  it('produces no Diagnostics for punctuation marks at the beginning/end of the string', async () => {
    const testEnv: TextTestEnvironment = TextTestEnvironment.createWithStandardWhitespace();
    await testEnv.init();

    expect(testEnv.whitespaceIssueFinder.produceDiagnostics('\u201Cquote at start and end of string\u201D')).toEqual(
      [],
    );
    expect(testEnv.whitespaceIssueFinder.produceDiagnostics('period ending the sentence.')).toEqual([]);
  });
});

describe('Tests with ScriptureNodes', () => {
  it('produces no Diagnostics for single ScriptureNodes with well-formed whitespace', async () => {
    const testEnv: ScriptureTestEnvironment = ScriptureTestEnvironment.createWithStandardWhitespace();
    await testEnv.init();

    expect(
      testEnv.whitespaceIssueFinder.produceDiagnosticsForScripture(
        testEnv.createScriptureNode('space. after the period', 1, 15, 1, 38),
      ),
    ).toEqual([]);
    expect(
      testEnv.whitespaceIssueFinder.produceDiagnosticsForScripture(
        testEnv.createScriptureNode('correct (spaces around the) parentheses', 2, 1, 2, 40),
      ),
    ).toEqual([]);
  });

  it('produces Diagnostics for whitespace errors in a single ScriptureNode', async () => {
    const testEnv: ScriptureTestEnvironment = ScriptureTestEnvironment.createWithStandardWhitespace();
    await testEnv.init();

    expect(
      testEnv.whitespaceIssueFinder.produceDiagnosticsForScripture(
        testEnv.createScriptureNode('missing.space', 3, 16, 3, 29),
      ),
    ).toEqual([testEnv.createExpectedTrailingWhitespaceDiagnostic(3, 23, 3, 24)]);
    expect(
      testEnv.whitespaceIssueFinder.produceDiagnosticsForScripture(
        testEnv.createScriptureNode('no space(before parenthesis', 4, 5, 4, 32),
      ),
    ).toEqual([testEnv.createExpectedLeadingWhitespaceDiagnostic(4, 13, 4, 14)]);
  });

  it('produces no Diagnostics for well-formed whitespace that spans across ScriptureNodes', async () => {
    const testEnv: ScriptureTestEnvironment = ScriptureTestEnvironment.createWithStandardWhitespace();
    await testEnv.init();

    expect(
      testEnv.whitespaceIssueFinder.produceDiagnosticsForScripture(
        ScriptureNodeGroup.createFromNodes([
          testEnv.createScriptureNode('ends with period.', 5, 12, 5, 29),
          testEnv.createScriptureNode(' starts with space', 5, 31, 5, 49),
        ]),
      ),
    ).toEqual([]);

    expect(
      testEnv.whitespaceIssueFinder.produceDiagnosticsForScripture(
        ScriptureNodeGroup.createFromNodes([
          testEnv.createScriptureNode('ends with a space ', 6, 1, 6, 19),
          testEnv.createScriptureNode('(starts with a parenthesis', 6, 35, 6, 61),
        ]),
      ),
    ).toEqual([]);
  });

  it('produces Diagnostics for whitespace errors that occur across ScriptureNodes', async () => {
    const testEnv: ScriptureTestEnvironment = ScriptureTestEnvironment.createWithStandardWhitespace();
    await testEnv.init();

    expect(
      testEnv.whitespaceIssueFinder.produceDiagnosticsForScripture(
        ScriptureNodeGroup.createFromNodes([
          testEnv.createScriptureNode('ends with a period.', 18, 15, 18, 34),
          testEnv.createScriptureNode('no space to start', 18, 41, 18, 58),
        ]),
      ),
    ).toEqual([testEnv.createExpectedTrailingWhitespaceDiagnostic(18, 33, 18, 34)]);
    expect(
      testEnv.whitespaceIssueFinder.produceDiagnosticsForScripture(
        ScriptureNodeGroup.createFromNodes([
          testEnv.createScriptureNode('ends without a space', 9, 122, 9, 142),
          testEnv.createScriptureNode('\u201Cstarts with a quote', 9, 151, 9, 171),
        ]),
      ),
    ).toEqual([testEnv.createExpectedLeadingWhitespaceDiagnostic(9, 151, 9, 152)]);
  });
});

describe('Miscellaneous tests', () => {
  it('gets its messages from the localizer', async () => {
    const customLocalizer: Localizer = new Localizer();
    customLocalizer.addNamespace('whitespace', (language: string) => {
      if (language === 'en') {
        return {
          diagnosticMessagesByCode: {
            'incorrect-leading-whitespace': 'you need some whitespace first',
            'incorrect-trailing-whitespace': 'you need some whitespace after this',
          },
        };
      } else if (language === 'es') {
        return {
          diagnosticMessagesByCode: {
            'incorrect-leading-whitespace': 'Primero necesitas un poco de espacio en blanco',
            'incorrect-trailing-whitespace': 'Necesitas un poco de espacio en blanco después de esto.',
          },
        };
      }
    });

    const testEnv: TextTestEnvironment =
      TextTestEnvironment.createWithStandardWhitespaceAndCustomLocalizer(customLocalizer);
    await testEnv.init();

    expect(testEnv.whitespaceIssueFinder.produceDiagnostics('no space.here')).toEqual([
      {
        code: 'incorrect-trailing-whitespace',
        severity: DiagnosticSeverity.Warning,
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
        source: 'whitespace-checker',
        message: 'you need some whitespace after this',
        data: '',
      },
    ]);

    await customLocalizer.changeLanguage('es');
    expect(testEnv.whitespaceIssueFinder.produceDiagnostics('no space.here')).toEqual([
      {
        code: 'incorrect-trailing-whitespace',
        severity: DiagnosticSeverity.Warning,
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
        source: 'whitespace-checker',
        message: 'Necesitas un poco de espacio en blanco después de esto.',
        data: '',
      },
    ]);
  });
});

class TextTestEnvironment {
  readonly whitespaceIssueFinderLocalizer: Localizer;
  readonly whitespaceIssueFinder: WhitespaceIssueFinder;

  constructor(
    private readonly whitespaceConfig: WhitespaceConfig,
    private readonly customLocalizer?: Localizer,
  ) {
    this.whitespaceIssueFinderLocalizer = this.createDefaultLocalizer();

    const stubDiagnosticFactory: DiagnosticFactory = new DiagnosticFactory(
      'whitespace-checker',
      new StubSingleLineTextDocument(''),
    );

    if (this.customLocalizer !== undefined) {
      this.whitespaceIssueFinder = new WhitespaceIssueFinderFactory(
        this.customLocalizer,
        whitespaceConfig,
      ).createIssueFinder(stubDiagnosticFactory);
    } else {
      this.whitespaceIssueFinder = new WhitespaceIssueFinderFactory(
        this.whitespaceIssueFinderLocalizer,
        whitespaceConfig,
      ).createIssueFinder(stubDiagnosticFactory);
    }
  }

  public async init(): Promise<void> {
    await this.whitespaceIssueFinderLocalizer.init();
    if (this.customLocalizer !== undefined) {
      await this.customLocalizer.init();
    }
  }

  private createDefaultLocalizer(): Localizer {
    const defaultLocalizer: Localizer = new Localizer();
    defaultLocalizer.addNamespace('whitespace', (_language: string) => {
      return {
        diagnosticMessagesByCode: {
          'incorrect-leading-whitespace': 'This punctuation mark should be preceded by whitespace.',
          'incorrect-trailing-whitespace': 'This punctuation mark should be followed by whitespace.',
        },
      };
    });
    return defaultLocalizer;
  }

  static createWithStandardWhitespace(): TextTestEnvironment {
    return new TextTestEnvironment(
      new WhitespaceConfig.Builder()
        .addRequiredWhitespaceRule(
          ContextDirection.Right,
          ['.', ',', ':', ';', '!', '?', ')', ']', '\u201D', '\u2019'],
          [' ', '\n', ''],
        )
        .addRequiredWhitespaceRule(ContextDirection.Left, ['(', '[', '\u201C', '\u2018'], [' ', '\n', ''])
        .build(),
    );
  }

  static createWithStandardWhitespaceAndCustomLocalizer(customLocalizer: Localizer): TextTestEnvironment {
    return new TextTestEnvironment(
      new WhitespaceConfig.Builder()
        .addRequiredWhitespaceRule(
          ContextDirection.Right,
          ['.', ',', ':', ';', '!', '?', ')', ']', '\u201D', '\u2019'],
          [' ', '\n', ''],
        )
        .addRequiredWhitespaceRule(ContextDirection.Left, ['(', '[', '\u201C', '\u2018'], [' ', '\n', ''])
        .addProhibitedWhitespaceRule(ContextDirection.Right, ['(', '[', '\u201C', '\u2018'])
        .addProhibitedWhitespaceRule(ContextDirection.Left, [
          '.',
          ',',
          ':',
          ';',
          '!',
          '?',
          ')',
          ']',
          '\u201D',
          '\u2019',
        ])
        .build(),
      customLocalizer,
    );
  }

  createExpectedLeadingWhitespaceDiagnostic(startIndex: number, endIndex: number): Diagnostic {
    return {
      code: 'incorrect-leading-whitespace',
      source: 'whitespace-checker',
      severity: DiagnosticSeverity.Warning,
      range: {
        start: {
          line: 0,
          character: startIndex,
        },
        end: {
          line: 0,
          character: endIndex,
        },
      },
      message: 'This punctuation mark should be preceded by whitespace.',
      data: '',
    };
  }

  createExpectedTrailingWhitespaceDiagnostic(startIndex: number, endIndex: number): Diagnostic {
    return {
      code: 'incorrect-trailing-whitespace',
      source: 'whitespace-checker',
      severity: DiagnosticSeverity.Warning,
      range: {
        start: {
          line: 0,
          character: startIndex,
        },
        end: {
          line: 0,
          character: endIndex,
        },
      },
      message: 'This punctuation mark should be followed by whitespace.',
      data: '',
    };
  }
}

class ScriptureTestEnvironment {
  readonly whitespaceIssueFinderLocalizer: Localizer;
  readonly whitespaceIssueFinder: WhitespaceIssueFinder;

  constructor(private readonly whitespaceConfig: WhitespaceConfig) {
    this.whitespaceIssueFinderLocalizer = this.createDefaultLocalizer();

    const stubDiagnosticFactory: DiagnosticFactory = new DiagnosticFactory(
      'whitespace-checker',
      new StubFixedLineWidthTextDocument(''),
    );

    this.whitespaceIssueFinder = new WhitespaceIssueFinderFactory(
      this.whitespaceIssueFinderLocalizer,
      whitespaceConfig,
    ).createIssueFinder(stubDiagnosticFactory);
  }

  public async init(): Promise<void> {
    await this.whitespaceIssueFinderLocalizer.init();
  }

  private createDefaultLocalizer(): Localizer {
    const defaultLocalizer: Localizer = new Localizer();
    defaultLocalizer.addNamespace('whitespace', (_language: string) => {
      return {
        diagnosticMessagesByCode: {
          'incorrect-leading-whitespace': 'This punctuation mark should be preceded by whitespace.',
          'incorrect-trailing-whitespace': 'This punctuation mark should be followed by whitespace.',
        },
      };
    });
    return defaultLocalizer;
  }

  static createWithStandardWhitespace(): ScriptureTestEnvironment {
    return new ScriptureTestEnvironment(
      new WhitespaceConfig.Builder()
        .addRequiredWhitespaceRule(
          ContextDirection.Right,
          ['.', ',', ':', ';', '!', '?', ')', ']', '\u201D', '\u2019'],
          [' ', '\n', ''],
        )
        .addRequiredWhitespaceRule(ContextDirection.Left, ['(', '[', '\u201C', '\u2018'], [' ', '\n', ''])
        .addProhibitedWhitespaceRule(ContextDirection.Right, ['(', '[', '\u201C', '\u2018'])
        .addProhibitedWhitespaceRule(ContextDirection.Left, [
          '.',
          ',',
          ':',
          ';',
          '!',
          '?',
          ')',
          ']',
          '\u201D',
          '\u2019',
        ])
        .build(),
    );
  }

  createExpectedLeadingWhitespaceDiagnostic(
    startLine: number,
    startCharacter: number,
    endLine: number,
    endCharacter: number,
  ): Diagnostic {
    return {
      code: 'incorrect-leading-whitespace',
      source: 'whitespace-checker',
      severity: DiagnosticSeverity.Warning,
      range: {
        start: {
          line: startLine,
          character: startCharacter,
        },
        end: {
          line: endLine,
          character: endCharacter,
        },
      },
      message: 'This punctuation mark should be preceded by whitespace.',
      data: '',
    };
  }

  createExpectedTrailingWhitespaceDiagnostic(
    startLine: number,
    startCharacter: number,
    endLine: number,
    endCharacter: number,
  ): Diagnostic {
    return {
      code: 'incorrect-trailing-whitespace',
      source: 'whitespace-checker',
      severity: DiagnosticSeverity.Warning,
      range: {
        start: {
          line: startLine,
          character: startCharacter,
        },
        end: {
          line: endLine,
          character: endCharacter,
        },
      },
      message: 'This punctuation mark should be followed by whitespace.',
      data: '',
    };
  }

  createScriptureNode(
    text: string,
    lineStart: number,
    characterStart: number,
    lineEnd: number,
    characterEnd: number,
  ): ScriptureNode {
    return new ScriptureText(text, {
      start: {
        line: lineStart,
        character: characterStart,
      },
      end: {
        line: lineEnd,
        character: characterEnd,
      },
    });
  }
}
