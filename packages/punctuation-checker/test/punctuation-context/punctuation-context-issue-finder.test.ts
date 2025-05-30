import {
  Diagnostic,
  DiagnosticSeverity,
  DocumentManager,
  Localizer,
  ScriptureDocument,
  ScriptureNode,
  ScriptureText,
} from '@sillsdev/lynx';
import { UsfmDocumentFactory } from '@sillsdev/lynx-usfm';
import { UsfmStylesheet } from '@sillsdev/machine/corpora';
import { describe, expect, it } from 'vitest';

import { CheckableGroup, ScriptureNodeCheckable, TextDocumentCheckable } from '../../src/checkable';
import { DiagnosticFactory } from '../../src/diagnostic-factory';
import { PunctuationContextConfig } from '../../src/punctuation-context/punctuation-context-config';
import type { PunctuationContextIssueFinder } from '../../src/punctuation-context/punctuation-context-issue-finder';
import { PunctuationContextIssueFinderFactory } from '../../src/punctuation-context/punctuation-context-issue-finder';
import { ScriptureTextNodeGrouper } from '../../src/scripture-grouper';
import {
  StubFixedLineWidthTextDocument,
  StubScriptureDocumentManager,
  StubSingleLineTextDocument,
} from '../test-utils';

describe('Tests with plain-text strings', () => {
  it('produces no Diagnostics for text with well-formed punctuation context', async () => {
    const testEnv: TextTestEnvironment = TextTestEnvironment.createWithStandardContextRules();
    await testEnv.init();

    expect(
      testEnv.PunctuationContextIssueFinder.produceDiagnostics(testEnv.createInput('end of sentence. start of next')),
    ).toEqual([]);
    expect(
      testEnv.PunctuationContextIssueFinder.produceDiagnostics(
        testEnv.createInput('spaces (on both sides) of parentheses'),
      ),
    ).toEqual([]);
    expect(
      testEnv.PunctuationContextIssueFinder.produceDiagnostics(
        testEnv.createInput('this contains: colons; semicolons, and commas'),
      ),
    ).toEqual([]);
  });

  it('produces Diagnostics for text with missing required punctuation context', async () => {
    const testEnv: TextTestEnvironment = TextTestEnvironment.createWithStandardContextRules();
    await testEnv.init();

    expect(
      testEnv.PunctuationContextIssueFinder.produceDiagnostics(testEnv.createInput('no space after.period')),
    ).toEqual([testEnv.createExpectedTrailingContextDiagnostic('.', 'p', 14, 15)]);
    expect(
      testEnv.PunctuationContextIssueFinder.produceDiagnostics(testEnv.createInput('no space(before parenthesis')),
    ).toEqual([testEnv.createExpectedLeadingContextDiagnostic('(', 'e', 8, 9)]);
  });

  it('produces no Diagnostics for punctuation marks at the beginning/end of the string', async () => {
    const testEnv: TextTestEnvironment = TextTestEnvironment.createWithStandardContextRules();
    await testEnv.init();

    expect(
      testEnv.PunctuationContextIssueFinder.produceDiagnostics(
        testEnv.createInput('\u201Cquote at start and end of string\u201D'),
      ),
    ).toEqual([]);
    expect(
      testEnv.PunctuationContextIssueFinder.produceDiagnostics(testEnv.createInput('period ending the sentence.')),
    ).toEqual([]);
  });
});

describe('Tests with ScriptureNodes', () => {
  it('produces no Diagnostics for single ScriptureNodes with well-formed punctuation context', async () => {
    const testEnv: ScriptureTestEnvironment = ScriptureTestEnvironment.createWithStandardContextRules();
    await testEnv.init();

    expect(
      testEnv.PunctuationContextIssueFinder.produceDiagnostics(
        testEnv.createInput(testEnv.createScriptureNode('space. after the period', 1, 15, 1, 38)),
      ),
    ).toEqual([]);
    expect(
      testEnv.PunctuationContextIssueFinder.produceDiagnostics(
        testEnv.createInput(testEnv.createScriptureNode('correct (spaces around the) parentheses', 2, 1, 2, 40)),
      ),
    ).toEqual([]);
  });

  it('produces Diagnostics for punctuation context errors in a single ScriptureNode', async () => {
    const testEnv: ScriptureTestEnvironment = ScriptureTestEnvironment.createWithStandardContextRules();
    await testEnv.init();

    expect(
      testEnv.PunctuationContextIssueFinder.produceDiagnostics(
        testEnv.createInput(testEnv.createScriptureNode('missing.space', 3, 16, 3, 29)),
      ),
    ).toEqual([testEnv.createExpectedTrailingContextDiagnostic('.', 's', 3, 23, 3, 24)]);
    expect(
      testEnv.PunctuationContextIssueFinder.produceDiagnostics(
        testEnv.createInput(testEnv.createScriptureNode('no space(before parenthesis', 4, 5, 4, 32)),
      ),
    ).toEqual([testEnv.createExpectedLeadingContextDiagnostic('(', 'e', 4, 13, 4, 14)]);
  });

  it('produces no Diagnostics for well-formed punctuation context that spans across ScriptureNodes', async () => {
    const testEnv: ScriptureTestEnvironment = ScriptureTestEnvironment.createWithStandardContextRules();
    await testEnv.init();

    expect(
      testEnv.PunctuationContextIssueFinder.produceDiagnostics(
        testEnv.createInput(
          testEnv.createScriptureNode('ends with period.', 5, 12, 5, 29),
          testEnv.createScriptureNode(' starts with space', 5, 31, 5, 49),
        ),
      ),
    ).toEqual([]);

    expect(
      testEnv.PunctuationContextIssueFinder.produceDiagnostics(
        testEnv.createInput(
          testEnv.createScriptureNode('ends with a space ', 6, 1, 6, 19),
          testEnv.createScriptureNode('(starts with a parenthesis', 6, 35, 6, 61),
        ),
      ),
    ).toEqual([]);
  });

  it('produces Diagnostics for punctuation context errors that occur across ScriptureNodes', async () => {
    const testEnv: ScriptureTestEnvironment = ScriptureTestEnvironment.createWithStandardContextRules();
    await testEnv.init();

    expect(
      testEnv.PunctuationContextIssueFinder.produceDiagnostics(
        testEnv.createInput(
          testEnv.createScriptureNode('ends with a period.', 18, 15, 18, 34),
          testEnv.createScriptureNode('no space to start', 18, 41, 18, 58),
        ),
      ),
    ).toEqual([testEnv.createExpectedTrailingContextDiagnostic('.', 'n', 18, 33, 18, 34)]);
    expect(
      testEnv.PunctuationContextIssueFinder.produceDiagnostics(
        testEnv.createInput(
          testEnv.createScriptureNode('ends without a space', 9, 122, 9, 142),
          testEnv.createScriptureNode('\u201Cstarts with a quote', 9, 151, 9, 171),
        ),
      ),
    ).toEqual([testEnv.createExpectedLeadingContextDiagnostic('\u201C', 'e', 9, 151, 9, 152)]);
  });

  it("doesn't consider punctuation context across ScriptureNodes when the punctuation context is possibly truncated", async () => {
    const testEnv: ScriptureTestEnvironment = ScriptureTestEnvironment.createWithNonStandardContextRules();
    await testEnv.init();

    // Due to the way the USFM parser works (it tries to intelligently add spaces),
    // it's very difficult to create a failing test, so this test is rather contrived with
    // "{" needing to be followed by "-" or an empty string
    const correctDoc: ScriptureDocument = await testEnv.createScriptureDocument(
      '\\c 1 \\v 1 First sentence{- Second sentence',
    );
    const correctVerseNodeGroup = new ScriptureTextNodeGrouper(correctDoc).getCheckableGroups().next().value;
    expect(testEnv.PunctuationContextIssueFinder.produceDiagnostics(correctVerseNodeGroup)).toEqual([]);

    const incorrectDoc: ScriptureDocument = await testEnv.createScriptureDocument(
      `\\c 1 \\v 1 First sentence{\\v 2 -Second sentence`,
    );
    const incorrectVerseNodeGroup = new ScriptureTextNodeGrouper(incorrectDoc).getCheckableGroups().next().value;
    expect(testEnv.PunctuationContextIssueFinder.produceDiagnostics(incorrectVerseNodeGroup)).toEqual([
      testEnv.createExpectedTrailingContextDiagnostic('{', ' ', 0, 24, 0, 25, false),
    ]);

    const correctBecauseOfTruncationDoc: ScriptureDocument = await testEnv.createScriptureDocument(
      `\\c 1 \\v 1 First sentence{ \\p \\v 2 -Second sentence`,
    );
    const correctBecauseOfTruncationVerseNodeGroup = new ScriptureTextNodeGrouper(correctBecauseOfTruncationDoc)
      .getCheckableGroups()
      .next().value;
    expect(testEnv.PunctuationContextIssueFinder.produceDiagnostics(correctBecauseOfTruncationVerseNodeGroup)).toEqual(
      [],
    );
  });
});

describe('Miscellaneous tests', () => {
  it('gets its messages from the localizer', async () => {
    const customLocalizer: Localizer = new Localizer();
    customLocalizer.addNamespace('punctuation-context', (language: string) => {
      if (language === 'en') {
        return {
          diagnosticMessagesByCode: {
            'incorrect-leading-context': 'you need some whitespace first',
            'incorrect-trailing-context': 'you need some whitespace after this',
          },
        };
      } else if (language === 'es') {
        return {
          diagnosticMessagesByCode: {
            'incorrect-leading-context': 'Primero necesitas un poco de espacio en blanco',
            'incorrect-trailing-context': 'Necesitas un poco de espacio en blanco después de esto.',
          },
        };
      }
    });

    const testEnv: TextTestEnvironment =
      TextTestEnvironment.createWithStandardContextRulesAndCustomLocalizer(customLocalizer);
    await testEnv.init();

    expect(testEnv.PunctuationContextIssueFinder.produceDiagnostics(testEnv.createInput('no space.here'))).toEqual([
      {
        code: 'incorrect-trailing-context',
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
        source: 'punctuation-context-checker',
        message: 'you need some whitespace after this',
        data: {
          isSpaceAllowed: true,
        },
      },
    ]);

    await customLocalizer.changeLanguage('es');
    expect(testEnv.PunctuationContextIssueFinder.produceDiagnostics(testEnv.createInput('no space.here'))).toEqual([
      {
        code: 'incorrect-trailing-context',
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
        source: 'punctuation-context-checker',
        message: 'Necesitas un poco de espacio en blanco después de esto.',
        data: {
          isSpaceAllowed: true,
        },
      },
    ]);
  });
});

class TextTestEnvironment {
  readonly PunctuationContextIssueFinderLocalizer: Localizer;
  readonly PunctuationContextIssueFinder: PunctuationContextIssueFinder;

  constructor(
    private readonly punctuationContextConfig: PunctuationContextConfig,
    private readonly customLocalizer?: Localizer,
  ) {
    this.PunctuationContextIssueFinderLocalizer = this.createDefaultLocalizer();

    const stubDiagnosticFactory: DiagnosticFactory = new DiagnosticFactory(
      'punctuation-context-checker',
      new StubSingleLineTextDocument(''),
    );

    if (this.customLocalizer !== undefined) {
      this.PunctuationContextIssueFinder = new PunctuationContextIssueFinderFactory(
        this.customLocalizer,
        punctuationContextConfig,
      ).createIssueFinder(stubDiagnosticFactory);
    } else {
      this.PunctuationContextIssueFinder = new PunctuationContextIssueFinderFactory(
        this.PunctuationContextIssueFinderLocalizer,
        punctuationContextConfig,
      ).createIssueFinder(stubDiagnosticFactory);
    }
  }

  public async init(): Promise<void> {
    await this.PunctuationContextIssueFinderLocalizer.init();
    if (this.customLocalizer !== undefined) {
      await this.customLocalizer.init();
    }
  }

  private createDefaultLocalizer(): Localizer {
    const defaultLocalizer: Localizer = new Localizer();
    defaultLocalizer.addNamespace('punctuation-context', (_language: string) => {
      return {
        diagnosticMessagesByCode: {
          'incorrect-leading-context':
            'The punctuation mark \u201C{{punctuationMark}}\u201D should not be immediately preceded by \u201C{{precedingCharacter}}\u201D.',
          'incorrect-trailing-context':
            'The punctuation mark \u201C{{punctuationMark}}\u201D should not be immediately followed by \u201C{{followingCharacter}}\u201D.',
        },
      };
    });
    return defaultLocalizer;
  }

  static createWithStandardContextRules(): TextTestEnvironment {
    return new TextTestEnvironment(
      new PunctuationContextConfig.Builder()
        .addProhibitedTrailingPattern(['.', ',', ':', ';', '!', '?', ')', ']', '\u201D', '\u2019'], /^[^ \n]/)
        .addProhibitedLeadingPattern(['(', '[', '\u201C', '\u2018'], /^[^ \n]/)
        .build(),
    );
  }

  static createWithStandardContextRulesAndCustomLocalizer(customLocalizer: Localizer): TextTestEnvironment {
    return new TextTestEnvironment(
      new PunctuationContextConfig.Builder()
        .addProhibitedTrailingPattern(['.', ',', ':', ';', '!', '?', ')', ']', '\u201D', '\u2019'], /^[^ \n]/)
        .addProhibitedLeadingPattern(['(', '[', '\u201C', '\u2018'], /^[^ \n]/)
        .addProhibitedTrailingPattern(['(', '[', '\u201C', '\u2018'], /^\s/)
        .addProhibitedLeadingPattern(['.', ',', ':', ';', '!', '?', ')', ']', '\u201D', '\u2019'], /^\s/)
        .build(),
      customLocalizer,
    );
  }

  createExpectedLeadingContextDiagnostic(
    punctuationMark: string,
    precedingCharacter: string,
    startIndex: number,
    endIndex: number,
  ): Diagnostic {
    return {
      code: 'incorrect-leading-context',
      source: 'punctuation-context-checker',
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
      message: `The punctuation mark \u201C${punctuationMark}\u201D should not be immediately preceded by \u201C${precedingCharacter}\u201D.`,
      data: {
        isSpaceAllowed: true,
      },
    };
  }

  createExpectedTrailingContextDiagnostic(
    punctuationMark: string,
    followingCharacter: string,
    startIndex: number,
    endIndex: number,
  ): Diagnostic {
    return {
      code: 'incorrect-trailing-context',
      source: 'punctuation-context-checker',
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
      message: `The punctuation mark \u201C${punctuationMark}\u201D should not be immediately followed by \u201C${followingCharacter}\u201D.`,
      data: {
        isSpaceAllowed: true,
      },
    };
  }

  createInput(text: string): CheckableGroup {
    return new CheckableGroup([new TextDocumentCheckable(text)]);
  }
}

class ScriptureTestEnvironment {
  readonly PunctuationContextIssueFinderLocalizer: Localizer;
  readonly PunctuationContextIssueFinder: PunctuationContextIssueFinder;
  readonly scriptureDocumentManager: DocumentManager<ScriptureDocument>;

  constructor(private readonly punctuationContextConfig: PunctuationContextConfig) {
    this.PunctuationContextIssueFinderLocalizer = this.createDefaultLocalizer();

    const stubDiagnosticFactory: DiagnosticFactory = new DiagnosticFactory(
      'punctuation-context-checker',
      new StubFixedLineWidthTextDocument(''),
    );

    this.PunctuationContextIssueFinder = new PunctuationContextIssueFinderFactory(
      this.PunctuationContextIssueFinderLocalizer,
      punctuationContextConfig,
    ).createIssueFinder(stubDiagnosticFactory);

    const stylesheet: UsfmStylesheet = new UsfmStylesheet('usfm.sty');
    this.scriptureDocumentManager = new StubScriptureDocumentManager(new UsfmDocumentFactory(stylesheet));
  }

  public async init(): Promise<void> {
    await this.PunctuationContextIssueFinderLocalizer.init();
  }

  private createDefaultLocalizer(): Localizer {
    const defaultLocalizer: Localizer = new Localizer();
    defaultLocalizer.addNamespace('punctuation-context', (_language: string) => {
      return {
        diagnosticMessagesByCode: {
          'incorrect-leading-context':
            'The punctuation mark \u201C{{punctuationMark}}\u201D should not be immediately preceded by \u201C{{precedingCharacter}}\u201D.',
          'incorrect-trailing-context':
            'The punctuation mark \u201C{{punctuationMark}}\u201D should not be immediately followed by \u201C{{followingCharacter}}\u201D.',
        },
      };
    });
    return defaultLocalizer;
  }

  static createWithStandardContextRules(): ScriptureTestEnvironment {
    return new ScriptureTestEnvironment(
      new PunctuationContextConfig.Builder()
        .addProhibitedTrailingPattern(['.', ',', ':', ';', '!', '?', ')', ']', '\u201D', '\u2019'], /^[^ \n]/)
        .addProhibitedLeadingPattern(['(', '[', '\u201C', '\u2018'], /^[^ \n]/)
        .addProhibitedTrailingPattern(['(', '[', '\u201C', '\u2018'], /^\s/)
        .addProhibitedLeadingPattern(['.', ',', ':', ';', '!', '?', ')', ']', '\u201D', '\u2019'], /^\s/)
        .build(),
    );
  }

  static createWithNonStandardContextRules(): ScriptureTestEnvironment {
    return new ScriptureTestEnvironment(
      new PunctuationContextConfig.Builder()
        .addProhibitedTrailingPattern(['.', ',', ':', ';', '!', '?', ')', ']', '\u201D', '\u2019'], /^[^ \n]/)
        .addProhibitedLeadingPattern(['(', '[', '\u201C', '\u2018'], /^[^ \n]/)
        .addProhibitedTrailingPattern(['{'], /^[^-]/)
        .addProhibitedTrailingPattern(['(', '[', '\u201C', '\u2018'], /^\s/)
        .addProhibitedLeadingPattern(['.', ',', ':', ';', '!', '?', ')', ']', '\u201D', '\u2019'], /^\s/)
        .build(),
    );
  }

  createExpectedLeadingContextDiagnostic(
    punctuationMark: string,
    precedingCharacter: string,
    startLine: number,
    startCharacter: number,
    endLine: number,
    endCharacter: number,
    isSpaceAllowed = true,
  ): Diagnostic {
    return {
      code: 'incorrect-leading-context',
      source: 'punctuation-context-checker',
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
      message: `The punctuation mark \u201C${punctuationMark}\u201D should not be immediately preceded by \u201C${precedingCharacter}\u201D.`,
      data: {
        isSpaceAllowed: isSpaceAllowed,
      },
    };
  }

  createExpectedTrailingContextDiagnostic(
    punctuationMark: string,
    followingCharacter: string,
    startLine: number,
    startCharacter: number,
    endLine: number,
    endCharacter: number,
    isSpaceAllowed = true,
  ): Diagnostic {
    return {
      code: 'incorrect-trailing-context',
      source: 'punctuation-context-checker',
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
      message: `The punctuation mark \u201C${punctuationMark}\u201D should not be immediately followed by \u201C${followingCharacter}\u201D.`,
      data: {
        isSpaceAllowed: isSpaceAllowed,
      },
    };
  }

  async createScriptureDocument(usfm: string): Promise<ScriptureDocument> {
    const doc = await this.scriptureDocumentManager.get(usfm);
    return doc!;
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

  createInput(...scriptureNodes: ScriptureNode[]): CheckableGroup {
    return new CheckableGroup(scriptureNodes.map((x) => new ScriptureNodeCheckable(x)));
  }
}
