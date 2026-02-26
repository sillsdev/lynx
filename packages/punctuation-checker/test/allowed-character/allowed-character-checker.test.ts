import {
  Diagnostic,
  DiagnosticProvider,
  DiagnosticSeverity,
  DocumentManager,
  Localizer,
  ScriptureDocument,
  ScriptureNode,
  ScriptureText,
  TextDocument,
  TextDocumentFactory,
  TextEditFactory,
} from '@sillsdev/lynx';
import { UsfmDocumentFactory } from '@sillsdev/lynx-usfm';
import { UsfmStylesheet } from '@sillsdev/machine/corpora';
import { describe, expect, it } from 'vitest';

import { AllowedCharacterChecker } from '../../src/allowed-character/allowed-character-checker';
import { AllowedCharacterSet, CharacterRegexWhitelist } from '../../src/allowed-character/allowed-character-set';
import { RuleType } from '../../src/rule-set/rule-set';
import { StandardRuleSets } from '../../src/rule-set/standard-rule-sets';
import { CharacterClassRegexBuilder } from '../../src/utils';
import { StubScriptureDocumentManager, StubTextDocumentManager } from '../test-utils';

describe('TextDocument tests', () => {
  it("doesn't provide any DiagnosticFixes", async () => {
    const testEnv: TextTestEnvironment = new TextTestEnvironment(new CharacterRegexWhitelist(/[a-zA-Z ]/));
    await testEnv.init();

    expect(
      await testEnv.allowedCharacterChecker.getDiagnosticActions(
        'Hello, _there!&%',
        testEnv.createExpectedDiagnostic(',', 5, 6),
      ),
    ).toEqual([]);
  });

  it('initializes its own namespace in the localizer', async () => {
    const testEnv: TextTestEnvironment = new TextTestEnvironment(new CharacterRegexWhitelist(/[a-zA-Z ]/));
    await testEnv.init();

    expect(await testEnv.allowedCharacterChecker.getDiagnostics('Hello^there')).toMatchObject([
      testEnv.createExpectedDiagnostic('^', 5, 6),
    ]);
  });

  it('gets its messages from the localizer', async () => {
    const customLocalizer: Localizer = new Localizer();
    customLocalizer.addNamespace('allowedCharacters', (language: string) => {
      if (language === 'en') {
        return {
          diagnosticMessagesByCode: {
            'disallowed-character': "Hey, stop using this character: '{{character}}'.",
          },
        };
      } else if (language === 'es') {
        return {
          diagnosticMessagesByCode: {
            'disallowed-character': "Oye, deja de usar este carácter: '{{character}}'.",
          },
        };
      }
    });

    const testEnv: TextTestEnvironment = new TextTestEnvironment(
      new CharacterRegexWhitelist(/[a-zA-Z ]/),
      customLocalizer,
    );
    await testEnv.init();

    expect(await testEnv.allowedCharacterChecker.getDiagnostics('Hello^there')).toMatchObject([
      {
        code: 'disallowed-character',
        severity: DiagnosticSeverity.Warning,
        range: {
          start: {
            line: 0,
            character: 5,
          },
          end: {
            line: 0,
            character: 6,
          },
        },
        source: 'allowed-character-set-checker',
        message: `Hey, stop using this character: '^'.`,
        data: '',
      },
    ]);

    await customLocalizer.changeLanguage('es');
    expect(await testEnv.allowedCharacterChecker.getDiagnostics('Hello^there')).toMatchObject([
      {
        code: 'disallowed-character',
        severity: DiagnosticSeverity.Warning,
        range: {
          start: {
            line: 0,
            character: 5,
          },
          end: {
            line: 0,
            character: 6,
          },
        },
        source: 'allowed-character-set-checker',
        message: `Oye, deja de usar este carácter: '^'.`,
        data: '',
      },
    ]);
  });

  it('uses the AllowedCharacterSet that is passed to it', async () => {
    const testEnv: TextTestEnvironment = new TextTestEnvironment(new CharacterRegexWhitelist(/[a-z ]/));
    await testEnv.init();

    expect(await testEnv.allowedCharacterChecker.getDiagnostics('hello there')).toHaveLength(0);
    expect(await testEnv.allowedCharacterChecker.getDiagnostics('heLlo ThEre')).toHaveLength(3);
  });
});

describe('integration tests', () => {
  describe('between AllowedCharacterChecker and AllowedCharacterIssueFinder', () => {
    it('correctly handles ASCII characters', async () => {
      const testEnv: TextTestEnvironment = new TextTestEnvironment(new CharacterRegexWhitelist(/[a-zA-Z ]/));
      await testEnv.init();

      expect(await testEnv.allowedCharacterChecker.getDiagnostics('hello there')).toEqual([]);
      expect(await testEnv.allowedCharacterChecker.getDiagnostics('hello there!')).toMatchObject([
        testEnv.createExpectedDiagnostic('!', 11, 12),
      ]);
    });
    it('correctly handles Unicode characters', async () => {
      const testEnv: TextTestEnvironment = new TextTestEnvironment(new CharacterRegexWhitelist(/[a-zA-Z ]/));
      await testEnv.init();

      expect(await testEnv.allowedCharacterChecker.getDiagnostics('h𝕖llo ther𝖊')).toMatchObject([
        testEnv.createExpectedDiagnostic('𝕖', 1, 3),
        testEnv.createExpectedDiagnostic('𝖊', 11, 13),
      ]);
    });
  });

  describe('with the standard English rule set', () => {
    it('produces no output for empty strings', async () => {
      const testEnv: TextTestEnvironment = TextTestEnvironment.createWithStandardEnglishCharacters();
      const standardEnglishCharacterSet = StandardRuleSets.English;
      const standardEnglishCharacterChecker: DiagnosticProvider =
        standardEnglishCharacterSet.createSelectedDiagnosticProviders(
          testEnv.allowedCharacterCheckerLocalizer,
          new StubTextDocumentManager(new TextDocumentFactory()),
          new TextEditFactory(),
          [RuleType.AllowedCharacters],
        )[0];
      await standardEnglishCharacterChecker.init();
      await testEnv.allowedCharacterCheckerLocalizer.init();

      expect(await standardEnglishCharacterChecker.getDiagnostics('')).toEqual([]);
    });

    it('produces no output for standard English allowed characters', async () => {
      const testEnv: TextTestEnvironment = TextTestEnvironment.createWithStandardEnglishCharacters();
      const standardEnglishCharacterSet = StandardRuleSets.English;
      const standardEnglishCharacterChecker: DiagnosticProvider =
        standardEnglishCharacterSet.createSelectedDiagnosticProviders(
          testEnv.allowedCharacterCheckerLocalizer,
          new StubTextDocumentManager(new TextDocumentFactory()),
          new TextEditFactory(),
          [RuleType.AllowedCharacters],
        )[0];
      await standardEnglishCharacterChecker.init();
      await testEnv.allowedCharacterCheckerLocalizer.init();

      expect(await standardEnglishCharacterChecker.getDiagnostics('Four score, and seven(!!!) years ago?')).toEqual([]);
      expect(await standardEnglishCharacterChecker.getDiagnostics('"4 Sc0r3;“ \tand\r’ 7 YRS ago: \n')).toEqual([]);
      expect(await standardEnglishCharacterChecker.getDiagnostics('ALL UPPERCASE TEXT')).toEqual([]);
      expect(await standardEnglishCharacterChecker.getDiagnostics('all lowercase text')).toEqual([]);
      expect(await standardEnglishCharacterChecker.getDiagnostics(' \t\n\r0123456789!()-:;\'",./?')).toEqual([]);
    });

    it('produces Diagnostics for disallowed ASCII characters', async () => {
      const testEnv: TextTestEnvironment = TextTestEnvironment.createWithStandardEnglishCharacters();
      const standardEnglishCharacterSet = StandardRuleSets.English;
      const standardEnglishCharacterChecker: DiagnosticProvider =
        standardEnglishCharacterSet.createSelectedDiagnosticProviders(
          testEnv.allowedCharacterCheckerLocalizer,
          new StubTextDocumentManager(new TextDocumentFactory()),
          new TextEditFactory(),
          [RuleType.AllowedCharacters],
        )[0];
      await standardEnglishCharacterChecker.init();
      await testEnv.allowedCharacterCheckerLocalizer.init();

      expect(await standardEnglishCharacterChecker.getDiagnostics('&{+$~')).toMatchObject([
        testEnv.createExpectedDiagnostic('&', 0, 1),
        testEnv.createExpectedDiagnostic('{', 1, 2),
        testEnv.createExpectedDiagnostic('+', 2, 3),
        testEnv.createExpectedDiagnostic('$', 3, 4),
        testEnv.createExpectedDiagnostic('~', 4, 5),
      ]);
    });

    it('produces Diagnostics for disallowed Unicode characters', async () => {
      const testEnv: TextTestEnvironment = TextTestEnvironment.createWithStandardEnglishCharacters();
      const standardEnglishCharacterSet = StandardRuleSets.English;
      const standardEnglishCharacterChecker: DiagnosticProvider =
        standardEnglishCharacterSet.createSelectedDiagnosticProviders(
          testEnv.allowedCharacterCheckerLocalizer,
          new StubTextDocumentManager(new TextDocumentFactory()),
          new TextEditFactory(),
          [RuleType.AllowedCharacters],
        )[0];
      await standardEnglishCharacterChecker.init();
      await testEnv.allowedCharacterCheckerLocalizer.init();

      // confusable characters
      expect(await standardEnglishCharacterChecker.getDiagnostics('аᖯ𝐜𝖽ｅ')).toMatchObject([
        testEnv.createExpectedDiagnostic('а', 0, 1),
        testEnv.createExpectedDiagnostic('ᖯ', 1, 2),
        testEnv.createExpectedDiagnostic('𝐜', 2, 4),
        testEnv.createExpectedDiagnostic('𝖽', 4, 6),
        testEnv.createExpectedDiagnostic('ｅ', 6, 7),
      ]);

      // other seemingly plausible characters
      expect(await standardEnglishCharacterChecker.getDiagnostics('‟″á×ꭗﬁ')).toMatchObject([
        testEnv.createExpectedDiagnostic('‟', 0, 1),
        testEnv.createExpectedDiagnostic('″', 1, 2),

        // These tests should be re-added once we add support for non-English
        //testEnv.createExpectedDiagnostic('á', 2, 3),
        //testEnv.createExpectedDiagnostic('×', 3, 4),
        testEnv.createExpectedDiagnostic('ꭗ', 4, 5),
        testEnv.createExpectedDiagnostic('ﬁ', 5, 6),
      ]);
    });
  });
});

describe('ScriptureDocument tests', () => {
  it('produces no errors for well-formed text', async () => {
    const testEnv: ScriptureTestEnvironment = ScriptureTestEnvironment.createWithStandardEnglishCharacters();
    await testEnv.init();

    expect(
      await testEnv.scriptureAllowedCharacterChecker.getDiagnostics(`\\id GEN
      \\toc3 Gen
      \\toc2 Genesis
      \\toc1 Genesis
      \\mt2 Book of
      \\mt1 Genesis
      \\c 1
      \\s Isaac and Rebekah
      \\p
      \\v 1 Now Abraham was old, well advanced in years. And the Lord had blessed Abraham in all things.`),
    ).toEqual([]);
  });

  it('identifies disallowed characters in verse text', async () => {
    const testEnv: ScriptureTestEnvironment = ScriptureTestEnvironment.createWithStandardEnglishCharacters();
    await testEnv.init();

    expect(
      await testEnv.scriptureAllowedCharacterChecker.getDiagnostics(`\\id GEN
      \\toc3 Gen
      \\toc2 Genesis
      \\toc1 Genesis
      \\mt2 Book of
      \\mt1 Genesis
      \\c 1
      \\s Isaac and Rebekah
      \\p
      \\v 1 The servant% said to him, “Perhaps the woman may not be ‘willing to follow me to this land. Must I then take your son back to the land from which you came?”`),
    ).toMatchObject([testEnv.createExpectedScriptureDiagnostic('%', 9, 22, 9, 23)]);
  });

  it('identifies disallowed characters that occur in non-verse portions', async () => {
    const testEnv: ScriptureTestEnvironment = ScriptureTestEnvironment.createWithStandardEnglishCharacters();
    await testEnv.init();

    expect(
      await testEnv.scriptureAllowedCharacterChecker.getDiagnostics(`\\id GEN
      \\toc3 G*n
      \\toc2 Gene$is
      \\toc1 Genesis
      \\mt2 Book @f
      \\mt1 Genesis
      \\c 1
      \\s |saac & Rebekah
      \\p
      \\v 1 The servant said to him, “Perhaps the woman may not be willing to follow me to this land. Must I then take your son back to the land from which you came?”`),
    ).toMatchObject([
      testEnv.createExpectedScriptureDiagnostic('*', 1, 13, 1, 14),
      testEnv.createExpectedScriptureDiagnostic('$', 2, 16, 2, 17),
      testEnv.createExpectedScriptureDiagnostic('@', 4, 16, 4, 17),
      testEnv.createExpectedScriptureDiagnostic('|', 7, 9, 7, 10),
      testEnv.createExpectedScriptureDiagnostic('&', 7, 15, 7, 16),
    ]);
  });
});
class TextTestEnvironment {
  readonly allowedCharacterCheckerLocalizer: Localizer;

  readonly allowedCharacterChecker: AllowedCharacterChecker<TextDocument>;

  constructor(
    private readonly allowedCharacterSet: AllowedCharacterSet,
    private readonly customLocalizer?: Localizer,
  ) {
    this.allowedCharacterCheckerLocalizer = new Localizer();
    const stubTextDocumentManager: StubTextDocumentManager = new StubTextDocumentManager(new TextDocumentFactory());
    this.allowedCharacterChecker = new AllowedCharacterChecker(
      this.customLocalizer ?? this.allowedCharacterCheckerLocalizer,
      stubTextDocumentManager,
      this.allowedCharacterSet,
    );
  }

  public async init(): Promise<void> {
    await this.allowedCharacterChecker.init();
    await this.allowedCharacterCheckerLocalizer.init();
    await this.customLocalizer?.init();
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
}

class ScriptureTestEnvironment {
  readonly allowedCharacterCheckerLocalizer: Localizer;
  readonly scriptureAllowedCharacterChecker: AllowedCharacterChecker<ScriptureDocument>;

  private readonly scriptureDocumentFactory: UsfmDocumentFactory;
  readonly scriptureDocumentManager: DocumentManager<ScriptureDocument>;

  constructor(private readonly allowedCharacterSet: AllowedCharacterSet) {
    this.allowedCharacterCheckerLocalizer = new Localizer();

    const stylesheet = new UsfmStylesheet('usfm.sty');
    this.scriptureDocumentFactory = new UsfmDocumentFactory(stylesheet);
    this.scriptureDocumentManager = new StubScriptureDocumentManager(this.scriptureDocumentFactory);
    this.scriptureAllowedCharacterChecker = new AllowedCharacterChecker(
      this.allowedCharacterCheckerLocalizer,
      this.scriptureDocumentManager,
      this.allowedCharacterSet,
    );
  }

  public async init(): Promise<void> {
    await this.scriptureAllowedCharacterChecker.init();
    await this.allowedCharacterCheckerLocalizer.init();
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
}
