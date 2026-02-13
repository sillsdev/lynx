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

import { AllowedCharacterIssueFinder } from '../../src/allowed-character/allowed-character-issue-finder';
import { AllowedCharacterSet, CharacterRegexWhitelist } from '../../src/allowed-character/allowed-character-set';
import { CheckableGroup, ScriptureNodeCheckable, TextDocumentCheckable } from '../../src/checkable';
import { DiagnosticFactory } from '../../src/diagnostic-factory';
import { CharacterClassRegexBuilder } from '../../src/utils';
import {
  StubFixedLineWidthTextDocument,
  StubScriptureDocumentManager,
  StubSingleLineTextDocument,
} from '../test-utils';

describe('Tests with plain-text strings', () => {
  describe('Diagnostics are created only for characters not on the whitelist', () => {
    describe('Simple cases', () => {
      it('produces no output for empty strings', async () => {
        const testEnv: TextTestEnvironment = new TextTestEnvironment(new CharacterRegexWhitelist(/[aeiouAEIOU]/));
        await testEnv.init();
        await expect(
          testEnv.allowedCharacterIssueFinder.produceDiagnostics(testEnv.createTextInput('')),
        ).resolves.toEqual([]);
      });

      it('produces Diagnostics for disallowed ASCII characters', async () => {
        const testEnv: TextTestEnvironment = new TextTestEnvironment(new CharacterRegexWhitelist(/[aeiouAEIOU]/));
        await testEnv.init();
        await expect(
          testEnv.allowedCharacterIssueFinder.produceDiagnostics(testEnv.createTextInput('g')),
        ).resolves.toMatchObject([testEnv.createExpectedDiagnostic('g', 0, 1)]);
        await expect(
          testEnv.allowedCharacterIssueFinder.produceDiagnostics(testEnv.createTextInput('bV')),
        ).resolves.toMatchObject([
          testEnv.createExpectedDiagnostic('b', 0, 1),
          testEnv.createExpectedDiagnostic('V', 1, 2),
        ]);
        await expect(
          testEnv.allowedCharacterIssueFinder.produceDiagnostics(testEnv.createTextInput('aaauoieAEOOOUI')),
        ).resolves.toEqual([]);
        await expect(
          testEnv.allowedCharacterIssueFinder.produceDiagnostics(testEnv.createTextInput('aaautoieAEOOOMUI')),
        ).resolves.toMatchObject([
          testEnv.createExpectedDiagnostic('t', 4, 5),
          testEnv.createExpectedDiagnostic('M', 13, 14),
        ]);
      });
    });

    describe('for basic Unicode', () => {
      it('correctly handles strings with Unicode-escaped ASCII characters', async () => {
        const testEnv: TextTestEnvironment = new TextTestEnvironment(new CharacterRegexWhitelist(/[aeiouAEIOU]/));
        await testEnv.init();

        await expect(
          testEnv.allowedCharacterIssueFinder.produceDiagnostics(
            testEnv.createTextInput(
              '\u0061\u0061\u0061\u0075\u006F\u0069\u0065\u0041\u0045\u004F\u004F\u004F\u0055\u0049',
            ),
          ),
        ).resolves.toEqual([]);
        await expect(
          testEnv.allowedCharacterIssueFinder.produceDiagnostics(testEnv.createTextInput('\u0062\u0056')),
        ).resolves.toMatchObject([
          testEnv.createExpectedDiagnostic('b', 0, 1),
          testEnv.createExpectedDiagnostic('V', 1, 2),
        ]);
      });

      it('correctly handles Unicode-escaped ASCII characters in the whitelist', async () => {
        const testEnv: TextTestEnvironment = new TextTestEnvironment(
          new CharacterRegexWhitelist(/[\u0061\u0065\u0069\u006F\u0075\u0041\u0045\u0049\u004F\u0055]/),
        );
        await testEnv.init();
        await expect(
          testEnv.allowedCharacterIssueFinder.produceDiagnostics(testEnv.createTextInput('aaauoieAEOOOUI')),
        ).resolves.toEqual([]);
        await expect(
          testEnv.allowedCharacterIssueFinder.produceDiagnostics(
            testEnv.createTextInput(
              '\u0061\u0061\u0061\u0075\u006F\u0069\u0065\u0041\u0045\u004F\u004F\u004F\u0055\u0049',
            ),
          ),
        ).resolves.toEqual([]);
        await expect(
          testEnv.allowedCharacterIssueFinder.produceDiagnostics(testEnv.createTextInput('\u0062\u0056')),
        ).resolves.toMatchObject([
          testEnv.createExpectedDiagnostic('b', 0, 1),
          testEnv.createExpectedDiagnostic('V', 1, 2),
        ]);
        await expect(
          testEnv.allowedCharacterIssueFinder.produceDiagnostics(testEnv.createTextInput('bV')),
        ).resolves.toMatchObject([
          testEnv.createExpectedDiagnostic('b', 0, 1),
          testEnv.createExpectedDiagnostic('V', 1, 2),
        ]);
      });

      it('correctly handles non-ASCII Unicode ranges in the whitelist', async () => {
        const testEnv: TextTestEnvironment = new TextTestEnvironment(new CharacterRegexWhitelist(/[\u2200-\u22FF]/));
        await testEnv.init();

        await expect(
          testEnv.allowedCharacterIssueFinder.produceDiagnostics(testEnv.createTextInput('≤⊕∴∀∂∯')),
        ).resolves.toEqual([]);
        await expect(
          testEnv.allowedCharacterIssueFinder.produceDiagnostics(
            testEnv.createTextInput('\u2264\u2295\u2234\u2200\u2202\u222F'),
          ),
        ).resolves.toEqual([]);

        await expect(
          testEnv.allowedCharacterIssueFinder.produceDiagnostics(testEnv.createTextInput('≤⊕∴∀A∯')),
        ).resolves.toMatchObject([testEnv.createExpectedDiagnostic('A', 4, 5)]);
        await expect(
          testEnv.allowedCharacterIssueFinder.produceDiagnostics(testEnv.createTextInput('≤⊕∴∀∯⨕')),
        ).resolves.toMatchObject([testEnv.createExpectedDiagnostic('⨕', 5, 6)]);
      });
    });

    describe('for complex Unicode', () => {
      it('correctly handles Unicode categories in the whitelist regex', async () => {
        const testEnv: TextTestEnvironment = new TextTestEnvironment(
          new CharacterRegexWhitelist(/[\p{General_Category=Math_Symbol}]/u),
        );
        await testEnv.init();

        await expect(
          testEnv.allowedCharacterIssueFinder.produceDiagnostics(testEnv.createTextInput('≤⊕∴∀∂∯')),
        ).resolves.toEqual([]);
        await expect(
          testEnv.allowedCharacterIssueFinder.produceDiagnostics(
            testEnv.createTextInput('\u2264\u2295\u2234\u2200\u2202\u222F'),
          ),
        ).resolves.toEqual([]);
        await expect(
          testEnv.allowedCharacterIssueFinder.produceDiagnostics(testEnv.createTextInput('≤⊕∴∀A∯')),
        ).resolves.toMatchObject([testEnv.createExpectedDiagnostic('A', 4, 5)]);
        await expect(
          testEnv.allowedCharacterIssueFinder.produceDiagnostics(testEnv.createTextInput('≤⊕∴∀∯ච')),
        ).resolves.toMatchObject([testEnv.createExpectedDiagnostic('ච', 5, 6)]);
      });

      it('correctly handles Unicode scripts in the whitelist regex', async () => {
        const testEnv: TextTestEnvironment = new TextTestEnvironment(
          new CharacterRegexWhitelist(/[\p{Script=Hebrew}]/u),
        );
        await testEnv.init();

        await expect(
          testEnv.allowedCharacterIssueFinder.produceDiagnostics(testEnv.createTextInput('לִינקס')),
        ).resolves.toEqual([]);
        await expect(
          testEnv.allowedCharacterIssueFinder.produceDiagnostics(testEnv.createTextInput('לִינקסקּ')),
        ).resolves.toEqual([]);
        await expect(
          testEnv.allowedCharacterIssueFinder.produceDiagnostics(
            testEnv.createTextInput('\u05DC\u05B4\u05D9\u05E0\u05E7\u05E1'),
          ),
        ).resolves.toEqual([]);

        // Mathematical version of aleph
        await expect(
          testEnv.allowedCharacterIssueFinder.produceDiagnostics(testEnv.createTextInput('לִינקסℵ')),
        ).resolves.toMatchObject([testEnv.createExpectedDiagnostic('ℵ', 6, 7)]);

        await expect(
          testEnv.allowedCharacterIssueFinder.produceDiagnostics(testEnv.createTextInput('לִxינקס')),
        ).resolves.toMatchObject([testEnv.createExpectedDiagnostic('x', 2, 3)]);
      });

      describe('correctly handles surrogate pairs and characters outside the basic multilingual plane', () => {
        it('handles ranges of characters with U+10000 and above', async () => {
          const testEnv: TextTestEnvironment = new TextTestEnvironment(
            new CharacterRegexWhitelist(/[\u{1F600}-\u{1F64F}]/u),
          );
          await testEnv.init();

          // all three of these strings should be equivalent
          await expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics(testEnv.createTextInput('😀😶🙅🙏')),
          ).resolves.toEqual([]);
          await expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics(
              testEnv.createTextInput('\u{1F600}\u{1F636}\u{1F645}\u{1F64F}'),
            ),
          ).resolves.toEqual([]);
          await expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics(
              testEnv.createTextInput('\uD83D\uDE00\uD83D\uDE36\uD83D\uDE45\uD83D\uDE4F'),
            ),
          ).resolves.toEqual([]);

          await expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics(testEnv.createTextInput('🙓😀m🚤')),
          ).resolves.toMatchObject([
            testEnv.createExpectedDiagnostic('🙓', 0, 2),
            testEnv.createExpectedDiagnostic('m', 4, 5),
            testEnv.createExpectedDiagnostic('🚤', 5, 7),
          ]);
          await expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics(
              testEnv.createTextInput('\u{1F653}\u{1F600}\u006D\u{1F6A4}'),
            ),
          ).resolves.toMatchObject([
            testEnv.createExpectedDiagnostic('🙓', 0, 2),
            testEnv.createExpectedDiagnostic('m', 4, 5),
            testEnv.createExpectedDiagnostic('🚤', 5, 7),
          ]);
          await expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics(
              testEnv.createTextInput('\uD83D\uDE53\uD83D\uDE00m\uD83D\uDEA4'),
            ),
          ).resolves.toMatchObject([
            testEnv.createExpectedDiagnostic('🙓', 0, 2),
            testEnv.createExpectedDiagnostic('m', 4, 5),
            testEnv.createExpectedDiagnostic('🚤', 5, 7),
          ]);
        });

        it('correctly handles explicit non-BMP characters', async () => {
          const testEnv: TextTestEnvironment = new TextTestEnvironment(
            new CharacterRegexWhitelist(/[😀😁😂😃😴😵😶😷🙄🙅🙆🙇🙌🙍🙎🙏]/u),
          );
          await testEnv.init();

          await expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics(testEnv.createTextInput('😀😶🙅🙏')),
          ).resolves.toEqual([]);
          await expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics(
              testEnv.createTextInput('\u{1F600}\u{1F636}\u{1F645}\u{1F64F}'),
            ),
          ).resolves.toEqual([]);
          await expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics(
              testEnv.createTextInput('\uD83D\uDE00\uD83D\uDE36\uD83D\uDE45\uD83D\uDE4F'),
            ),
          ).resolves.toEqual([]);

          await expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics(testEnv.createTextInput('🙓😀m🚤😎')),
          ).resolves.toMatchObject([
            testEnv.createExpectedDiagnostic('🙓', 0, 2),
            testEnv.createExpectedDiagnostic('m', 4, 5),
            testEnv.createExpectedDiagnostic('🚤', 5, 7),
            testEnv.createExpectedDiagnostic('😎', 7, 9),
          ]);
          await expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics(
              testEnv.createTextInput('\u{1F653}\u{1F600}\u006D\u{1F6A4}\u{1F60E}'),
            ),
          ).resolves.toMatchObject([
            testEnv.createExpectedDiagnostic('🙓', 0, 2),
            testEnv.createExpectedDiagnostic('m', 4, 5),
            testEnv.createExpectedDiagnostic('🚤', 5, 7),
            testEnv.createExpectedDiagnostic('😎', 7, 9),
          ]);
          await expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics(
              testEnv.createTextInput('\uD83D\uDE53\uD83D\uDE00m\uD83D\uDEA4\uD83D\uDE0E'),
            ),
          ).resolves.toMatchObject([
            testEnv.createExpectedDiagnostic('🙓', 0, 2),
            testEnv.createExpectedDiagnostic('m', 4, 5),
            testEnv.createExpectedDiagnostic('🚤', 5, 7),
            testEnv.createExpectedDiagnostic('😎', 7, 9),
          ]);
        });

        it('correctly handles ranges expressed with surrogate pairs', async () => {
          const testEnv: TextTestEnvironment = new TextTestEnvironment(
            new CharacterRegexWhitelist(/[\uD83D\uDE00-\uD83D\uDE4F]/u),
          );
          await testEnv.init();

          await expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics(testEnv.createTextInput('😀😶🙅🙏')),
          ).resolves.toEqual([]);
          await expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics(
              testEnv.createTextInput('\u{1F600}\u{1F636}\u{1F645}\u{1F64F}'),
            ),
          ).resolves.toEqual([]);
          await expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics(
              testEnv.createTextInput('\uD83D\uDE00\uD83D\uDE36\uD83D\uDE45\uD83D\uDE4F'),
            ),
          ).resolves.toEqual([]);

          await expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics(testEnv.createTextInput('🙓😀m🚤')),
          ).resolves.toMatchObject([
            testEnv.createExpectedDiagnostic('🙓', 0, 2),
            testEnv.createExpectedDiagnostic('m', 4, 5),
            testEnv.createExpectedDiagnostic('🚤', 5, 7),
          ]);
          await expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics(
              testEnv.createTextInput('\u{1F653}\u{1F600}\u006D\u{1F6A4}'),
            ),
          ).resolves.toMatchObject([
            testEnv.createExpectedDiagnostic('🙓', 0, 2),
            testEnv.createExpectedDiagnostic('m', 4, 5),
            testEnv.createExpectedDiagnostic('🚤', 5, 7),
          ]);
          await expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics(
              testEnv.createTextInput('\uD83D\uDE53\uD83D\uDE00m\uD83D\uDEA4'),
            ),
          ).resolves.toMatchObject([
            testEnv.createExpectedDiagnostic('🙓', 0, 2),
            testEnv.createExpectedDiagnostic('m', 4, 5),
            testEnv.createExpectedDiagnostic('🚤', 5, 7),
          ]);

          // invalid surrogate pairs
          await expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics(testEnv.createTextInput('\uD83D')),
          ).resolves.toMatchObject([testEnv.createExpectedDiagnostic('\uD83D', 0, 1)]);
          await expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics(testEnv.createTextInput('\uD83D\u0061')),
          ).resolves.toMatchObject([
            testEnv.createExpectedDiagnostic('\uD83D', 0, 1),
            testEnv.createExpectedDiagnostic('a', 1, 2),
          ]);
          await expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics(testEnv.createTextInput('\uD83D\u{1F600}')),
          ).resolves.toMatchObject([testEnv.createExpectedDiagnostic('\uD83D', 0, 1)]);
        });
      });
    });
  });
});

describe('Tests with ScriptureNodes', () => {
  it('identifies issues in a single ScriptureNode', async () => {
    const testEnv: ScriptureTestEnvironment = ScriptureTestEnvironment.createWithStandardEnglishCharacters();
    await testEnv.init();

    await expect(
      testEnv.allowedCharacterIssueFinder.produceDiagnostics(
        testEnv.createScriptureInput(testEnv.createScriptureNode('Some @verse text', 5, 5, 5, 20)),
      ),
    ).resolves.toMatchObject([testEnv.createExpectedScriptureDiagnostic('@', 5, 10, 5, 11)]);
  });

  it('identifies issues in multiple ScriptureNodes', async () => {
    const testEnv: ScriptureTestEnvironment = ScriptureTestEnvironment.createWithStandardEnglishCharacters();
    await testEnv.init();

    await expect(
      testEnv.allowedCharacterIssueFinder.produceDiagnostics(
        testEnv.createScriptureInput(
          testEnv.createScriptureNode('Some @verse text', 5, 5, 5, 20),
          testEnv.createScriptureNode('$ome other *verse text', 6, 8, 6, 30),
        ),
      ),
    ).resolves.toMatchObject([
      testEnv.createExpectedScriptureDiagnostic('@', 5, 10, 5, 11),
      testEnv.createExpectedScriptureDiagnostic('$', 6, 8, 6, 9),
      testEnv.createExpectedScriptureDiagnostic('*', 6, 19, 6, 20),
    ]);
  });
});

class TextTestEnvironment {
  readonly allowedCharacterIssueFinderLocalizer: Localizer;
  readonly allowedCharacterIssueFinder;

  constructor(private readonly allowedCharacterSet: AllowedCharacterSet) {
    this.allowedCharacterIssueFinderLocalizer = this.createDefaultLocalizer();

    const stubDiagnosticFactory: DiagnosticFactory = new DiagnosticFactory(
      'allowed-character-set-checker',
      new StubSingleLineTextDocument(''),
    );

    this.allowedCharacterIssueFinder = new AllowedCharacterIssueFinder(
      this.allowedCharacterIssueFinderLocalizer,
      stubDiagnosticFactory,
      this.allowedCharacterSet,
    );
  }

  private createDefaultLocalizer(): Localizer {
    const defaultLocalizer: Localizer = new Localizer();
    defaultLocalizer.addNamespace('allowedCharacters', (_language: string) => {
      return {
        diagnosticMessagesByCode: {
          'disallowed-character': "The character '{{character}}' is not typically used in this language.",
        },
      };
    });
    return defaultLocalizer;
  }

  public async init(): Promise<void> {
    await this.allowedCharacterIssueFinderLocalizer.init();
  }

  static createWithStandardEnglishCharacters(): TextTestEnvironment {
    return new TextTestEnvironment(
      new CharacterRegexWhitelist(
        new CharacterClassRegexBuilder()
          .addRange('A', 'Z')
          .addRange('a', 'z')
          .addRange('0', '9')
          .addCharacters(['.', ',', '?', '/', '\\', ':', ';', '(', ')', '-', '—', '!'])
          .addCharacters(['"', "'", '\u2018', '\u2019', '\u201C', '\u201D'])
          .addCharacters([' ', '\r', '\n', '\t'])
          .build(),
      ),
    );
  }

  createExpectedDiagnostic(character: string, startOffset: number, endOffset: number): Diagnostic {
    return {
      code: 'disallowed-character',
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
      source: 'allowed-character-set-checker',
      message: `The character '${character}' is not typically used in this language.`,
      data: '',
    };
  }

  createTextInput(text: string): CheckableGroup {
    return new CheckableGroup([new TextDocumentCheckable(text)]);
  }
}

class ScriptureTestEnvironment {
  readonly allowedCharacterIssueFinderLocalizer: Localizer;
  readonly allowedCharacterIssueFinder;

  private readonly scriptureDocumentFactory: UsfmDocumentFactory;
  readonly scriptureDocumentManager: DocumentManager<ScriptureDocument>;

  constructor(
    private readonly allowedCharacterSet: AllowedCharacterSet,
    private readonly customLocalizer?: Localizer,
  ) {
    this.allowedCharacterIssueFinderLocalizer = this.createDefaultLocalizer();

    const stubDiagnosticFactory: DiagnosticFactory = new DiagnosticFactory(
      'allowed-character-set-checker',
      new StubFixedLineWidthTextDocument(''),
    );

    this.allowedCharacterIssueFinder = new AllowedCharacterIssueFinder(
      this.customLocalizer ?? this.allowedCharacterIssueFinderLocalizer,
      stubDiagnosticFactory,
      this.allowedCharacterSet,
    );

    const stylesheet = new UsfmStylesheet('usfm.sty');
    this.scriptureDocumentFactory = new UsfmDocumentFactory(stylesheet);
    this.scriptureDocumentManager = new StubScriptureDocumentManager(this.scriptureDocumentFactory);
  }

  private createDefaultLocalizer(): Localizer {
    const defaultLocalizer: Localizer = new Localizer();
    defaultLocalizer.addNamespace('allowedCharacters', (_language: string) => {
      return {
        diagnosticMessagesByCode: {
          'disallowed-character': "The character '{{character}}' is not typically used in this language.",
        },
      };
    });
    return defaultLocalizer;
  }

  public async init(): Promise<void> {
    await this.allowedCharacterIssueFinderLocalizer.init();
    await this.customLocalizer?.init();
  }

  static createWithStandardEnglishCharacters(): ScriptureTestEnvironment {
    return new ScriptureTestEnvironment(
      new CharacterRegexWhitelist(
        new CharacterClassRegexBuilder()
          .addRange('A', 'Z')
          .addRange('a', 'z')
          .addRange('0', '9')
          .addCharacters(['.', ',', '?', '/', '\\', ':', ';', '(', ')', '-', '—', '!'])
          .addCharacters(['"', "'", '\u2018', '\u2019', '\u201C', '\u201D'])
          .addCharacters([' ', '\r', '\n', '\t'])
          .build(),
      ),
    );
  }

  createExpectedScriptureDiagnostic(
    character: string,
    startLine: number,
    startOffset: number,
    endLine: number,
    endOffset: number,
  ): Diagnostic {
    return {
      code: 'disallowed-character',
      severity: DiagnosticSeverity.Warning,
      range: {
        start: {
          line: startLine,
          character: startOffset,
        },
        end: {
          line: endLine,
          character: endOffset,
        },
      },
      source: 'allowed-character-set-checker',
      message: `The character '${character}' is not typically used in this language.`,
      data: '',
    };
  }

  createScriptureDocument(id: string, usfm: string): ScriptureDocument {
    return this.scriptureDocumentFactory.create(id, { format: 'usfm', version: 1, content: usfm });
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

  createScriptureInput(...scriptureNodes: ScriptureNode[]): CheckableGroup {
    return new CheckableGroup(scriptureNodes.map((x) => new ScriptureNodeCheckable('1', '1', x)));
  }
}
