import {
  Diagnostic,
  DiagnosticProvider,
  DiagnosticSeverity,
  Localizer,
  ScriptureDocument,
  TextDocumentFactory,
} from '@sillsdev/lynx';
import { UsfmDocumentFactory } from '@sillsdev/lynx-usfm';
import { UsfmStylesheet } from '@sillsdev/machine/corpora';
import { describe, expect, it } from 'vitest';

import { _privateTestingClasses, AllowedCharacterChecker } from '../../src/allowed-character/allowed-character-checker';
import { AllowedCharacterSet, CharacterRegexWhitelist } from '../../src/allowed-character/allowed-character-set';
import { DiagnosticFactory } from '../../src/diagnostic-factory';
import { RuleType } from '../../src/rule-set/rule-set';
import { StandardRuleSets } from '../../src/rule-set/standard-rule-sets';
import { CharacterClassRegexBuilder } from '../../src/utils';
import { StubDocumentManager, StubSingleLineTextDocument } from '../test-utils';

describe('AllowedCharacterIssueFinder tests', () => {
  describe('Diagnostics are created only for characters not on the whitelist', () => {
    describe('Simple cases', () => {
      it('produces no output for empty strings', async () => {
        const testEnv: TestEnvironment = new TestEnvironment(new CharacterRegexWhitelist(/[aeiouAEIOU]/));
        await testEnv.init();
        expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('')).toEqual([]);
      });

      it('produces Diagnostics for disallowed ASCII characters', async () => {
        const testEnv: TestEnvironment = new TestEnvironment(new CharacterRegexWhitelist(/[aeiouAEIOU]/));
        await testEnv.init();
        expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('g')).toEqual([
          testEnv.createExpectedDiagnostic('g', 0, 1),
        ]);
        expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('bV')).toEqual([
          testEnv.createExpectedDiagnostic('b', 0, 1),
          testEnv.createExpectedDiagnostic('V', 1, 2),
        ]);
        expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('aaauoieAEOOOUI')).toEqual([]);
        expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('aaautoieAEOOOMUI')).toEqual([
          testEnv.createExpectedDiagnostic('t', 4, 5),
          testEnv.createExpectedDiagnostic('M', 13, 14),
        ]);
      });
    });

    describe('for basic Unicode', () => {
      it('correctly handles strings with Unicode-escaped ASCII characters', async () => {
        const testEnv: TestEnvironment = new TestEnvironment(new CharacterRegexWhitelist(/[aeiouAEIOU]/));
        await testEnv.init();

        expect(
          testEnv.allowedCharacterIssueFinder.produceDiagnostics(
            '\u0061\u0061\u0061\u0075\u006F\u0069\u0065\u0041\u0045\u004F\u004F\u004F\u0055\u0049',
          ),
        ).toEqual([]);
        expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('\u0062\u0056')).toEqual([
          testEnv.createExpectedDiagnostic('b', 0, 1),
          testEnv.createExpectedDiagnostic('V', 1, 2),
        ]);
      });

      it('correctly handles Unicode-escaped ASCII characters in the whitelist', async () => {
        const testEnv: TestEnvironment = new TestEnvironment(
          new CharacterRegexWhitelist(/[\u0061\u0065\u0069\u006F\u0075\u0041\u0045\u0049\u004F\u0055]/),
        );
        await testEnv.init();

        expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('aaauoieAEOOOUI')).toEqual([]);
        expect(
          testEnv.allowedCharacterIssueFinder.produceDiagnostics(
            '\u0061\u0061\u0061\u0075\u006F\u0069\u0065\u0041\u0045\u004F\u004F\u004F\u0055\u0049',
          ),
        ).toEqual([]);
        expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('\u0062\u0056')).toEqual([
          testEnv.createExpectedDiagnostic('b', 0, 1),
          testEnv.createExpectedDiagnostic('V', 1, 2),
        ]);
        expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('bV')).toEqual([
          testEnv.createExpectedDiagnostic('b', 0, 1),
          testEnv.createExpectedDiagnostic('V', 1, 2),
        ]);
      });

      it('correctly handles non-ASCII Unicode ranges in the whitelist', async () => {
        const testEnv: TestEnvironment = new TestEnvironment(new CharacterRegexWhitelist(/[\u2200-\u22FF]/));
        await testEnv.init();

        expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('≤⊕∴∀∂∯')).toEqual([]);
        expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('\u2264\u2295\u2234\u2200\u2202\u222F')).toEqual(
          [],
        );

        expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('≤⊕∴∀A∯')).toEqual([
          testEnv.createExpectedDiagnostic('A', 4, 5),
        ]);
        expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('≤⊕∴∀∯⨕')).toEqual([
          testEnv.createExpectedDiagnostic('⨕', 5, 6),
        ]);
      });
    });

    describe('for complex Unicode', () => {
      it('correctly handles Unicode categories in the whitelist regex', async () => {
        const testEnv: TestEnvironment = new TestEnvironment(
          new CharacterRegexWhitelist(/[\p{General_Category=Math_Symbol}]/u),
        );
        await testEnv.init();

        expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('≤⊕∴∀∂∯')).toEqual([]);
        expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('\u2264\u2295\u2234\u2200\u2202\u222F')).toEqual(
          [],
        );
        expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('≤⊕∴∀A∯')).toEqual([
          testEnv.createExpectedDiagnostic('A', 4, 5),
        ]);
        expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('≤⊕∴∀∯ච')).toEqual([
          testEnv.createExpectedDiagnostic('ච', 5, 6),
        ]);
      });

      it('correctly handles Unicode scripts in the whitelist regex', async () => {
        const testEnv: TestEnvironment = new TestEnvironment(new CharacterRegexWhitelist(/[\p{Script=Hebrew}]/u));
        await testEnv.init();

        expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('לִינקס')).toEqual([]);
        expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('לִינקסקּ')).toEqual([]);
        expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('\u05DC\u05B4\u05D9\u05E0\u05E7\u05E1')).toEqual(
          [],
        );

        // Mathematical version of aleph
        expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('לִינקסℵ')).toEqual([
          testEnv.createExpectedDiagnostic('ℵ', 6, 7),
        ]);

        expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('לִxינקס')).toEqual([
          testEnv.createExpectedDiagnostic('x', 2, 3),
        ]);
      });

      describe('correctly handles surrogate pairs and characters outside the basic multilingual plane', () => {
        it('handles ranges of characters with U+10000 and above', async () => {
          const testEnv: TestEnvironment = new TestEnvironment(new CharacterRegexWhitelist(/[\u{1F600}-\u{1F64F}]/u));
          await testEnv.init();

          // all three of these strings should be equivalent
          expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('😀😶🙅🙏')).toEqual([]);
          expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics('\u{1F600}\u{1F636}\u{1F645}\u{1F64F}'),
          ).toEqual([]);
          expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics('\uD83D\uDE00\uD83D\uDE36\uD83D\uDE45\uD83D\uDE4F'),
          ).toEqual([]);

          expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('🙓😀m🚤')).toEqual([
            testEnv.createExpectedDiagnostic('🙓', 0, 2),
            testEnv.createExpectedDiagnostic('m', 4, 5),
            testEnv.createExpectedDiagnostic('🚤', 5, 7),
          ]);
          expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('\u{1F653}\u{1F600}\u006D\u{1F6A4}')).toEqual([
            testEnv.createExpectedDiagnostic('🙓', 0, 2),
            testEnv.createExpectedDiagnostic('m', 4, 5),
            testEnv.createExpectedDiagnostic('🚤', 5, 7),
          ]);
          expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics('\uD83D\uDE53\uD83D\uDE00m\uD83D\uDEA4'),
          ).toEqual([
            testEnv.createExpectedDiagnostic('🙓', 0, 2),
            testEnv.createExpectedDiagnostic('m', 4, 5),
            testEnv.createExpectedDiagnostic('🚤', 5, 7),
          ]);
        });

        it('correctly handles explicit non-BMP characters', async () => {
          const testEnv: TestEnvironment = new TestEnvironment(
            new CharacterRegexWhitelist(/[😀😁😂😃😴😵😶😷🙄🙅🙆🙇🙌🙍🙎🙏]/u),
          );
          await testEnv.init();

          expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('😀😶🙅🙏')).toEqual([]);
          expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics('\u{1F600}\u{1F636}\u{1F645}\u{1F64F}'),
          ).toEqual([]);
          expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics('\uD83D\uDE00\uD83D\uDE36\uD83D\uDE45\uD83D\uDE4F'),
          ).toEqual([]);

          expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('🙓😀m🚤😎')).toEqual([
            testEnv.createExpectedDiagnostic('🙓', 0, 2),
            testEnv.createExpectedDiagnostic('m', 4, 5),
            testEnv.createExpectedDiagnostic('🚤', 5, 7),
            testEnv.createExpectedDiagnostic('😎', 7, 9),
          ]);
          expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics('\u{1F653}\u{1F600}\u006D\u{1F6A4}\u{1F60E}'),
          ).toEqual([
            testEnv.createExpectedDiagnostic('🙓', 0, 2),
            testEnv.createExpectedDiagnostic('m', 4, 5),
            testEnv.createExpectedDiagnostic('🚤', 5, 7),
            testEnv.createExpectedDiagnostic('😎', 7, 9),
          ]);
          expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics('\uD83D\uDE53\uD83D\uDE00m\uD83D\uDEA4\uD83D\uDE0E'),
          ).toEqual([
            testEnv.createExpectedDiagnostic('🙓', 0, 2),
            testEnv.createExpectedDiagnostic('m', 4, 5),
            testEnv.createExpectedDiagnostic('🚤', 5, 7),
            testEnv.createExpectedDiagnostic('😎', 7, 9),
          ]);
        });

        it('correctly handles ranges expressed with surrogate pairs', async () => {
          const testEnv: TestEnvironment = new TestEnvironment(
            new CharacterRegexWhitelist(/[\uD83D\uDE00-\uD83D\uDE4F]/u),
          );
          await testEnv.init();

          expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('😀😶🙅🙏')).toEqual([]);
          expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics('\u{1F600}\u{1F636}\u{1F645}\u{1F64F}'),
          ).toEqual([]);
          expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics('\uD83D\uDE00\uD83D\uDE36\uD83D\uDE45\uD83D\uDE4F'),
          ).toEqual([]);

          expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('🙓😀m🚤')).toEqual([
            testEnv.createExpectedDiagnostic('🙓', 0, 2),
            testEnv.createExpectedDiagnostic('m', 4, 5),
            testEnv.createExpectedDiagnostic('🚤', 5, 7),
          ]);
          expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('\u{1F653}\u{1F600}\u006D\u{1F6A4}')).toEqual([
            testEnv.createExpectedDiagnostic('🙓', 0, 2),
            testEnv.createExpectedDiagnostic('m', 4, 5),
            testEnv.createExpectedDiagnostic('🚤', 5, 7),
          ]);
          expect(
            testEnv.allowedCharacterIssueFinder.produceDiagnostics('\uD83D\uDE53\uD83D\uDE00m\uD83D\uDEA4'),
          ).toEqual([
            testEnv.createExpectedDiagnostic('🙓', 0, 2),
            testEnv.createExpectedDiagnostic('m', 4, 5),
            testEnv.createExpectedDiagnostic('🚤', 5, 7),
          ]);

          // invalid surrogate pairs
          expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('\uD83D')).toEqual([
            testEnv.createExpectedDiagnostic('\uD83D', 0, 1),
          ]);
          expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('\uD83D\u0061')).toEqual([
            testEnv.createExpectedDiagnostic('\uD83D', 0, 1),
            testEnv.createExpectedDiagnostic('a', 1, 2),
          ]);
          expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics('\uD83D\u{1F600}')).toEqual([
            testEnv.createExpectedDiagnostic('\uD83D', 0, 1),
          ]);
        });
      });
    });
  });
});

const stubDocumentManager: StubDocumentManager = new StubDocumentManager(new TextDocumentFactory());

describe('AllowedCharacterChecker tests', () => {
  it("doesn't provide any DiagnosticFixes", async () => {
    const testEnv: TestEnvironment = new TestEnvironment(new CharacterRegexWhitelist(/[a-zA-Z ]/));
    await testEnv.init();

    expect(
      await testEnv.allowedCharacterChecker.getDiagnosticFixes(
        'Hello, _there!&%',
        testEnv.createExpectedDiagnostic(',', 5, 6),
      ),
    ).toEqual([]);
  });

  it('initializes its own namespace in the localizer', async () => {
    const testEnv: TestEnvironment = new TestEnvironment(new CharacterRegexWhitelist(/[a-zA-Z ]/));
    await testEnv.init();

    expect(await testEnv.allowedCharacterChecker.getDiagnostics('Hello^there')).toEqual([
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

    const testEnv: TestEnvironment = new TestEnvironment(new CharacterRegexWhitelist(/[a-zA-Z ]/), customLocalizer);
    await testEnv.init();

    expect(await testEnv.allowedCharacterChecker.getDiagnostics('Hello^there')).toEqual([
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
    expect(await testEnv.allowedCharacterChecker.getDiagnostics('Hello^there')).toEqual([
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
});

describe('integration tests', () => {
  describe('between AllowedCharacterChecker and AllowedCharacterIssueFinder', () => {
    it('correctly handles ASCII characters', async () => {
      const testEnv: TestEnvironment = new TestEnvironment(new CharacterRegexWhitelist(/[a-zA-Z ]/));
      await testEnv.init();

      expect(await testEnv.allowedCharacterChecker.getDiagnostics('hello there')).toEqual([]);
      expect(await testEnv.allowedCharacterChecker.getDiagnostics('hello there!')).toEqual([
        testEnv.createExpectedDiagnostic('!', 11, 12),
      ]);
    });
    it('correctly handles Unicode characters', async () => {
      const testEnv: TestEnvironment = new TestEnvironment(new CharacterRegexWhitelist(/[a-zA-Z ]/));
      await testEnv.init();

      expect(await testEnv.allowedCharacterChecker.getDiagnostics('h𝕖llo ther𝖊')).toEqual([
        testEnv.createExpectedDiagnostic('𝕖', 1, 3),
        testEnv.createExpectedDiagnostic('𝖊', 11, 13),
      ]);
    });
  });

  describe('with the standard English rule set', () => {
    it('produces no output for empty strings', async () => {
      const localizer: Localizer = new Localizer();
      const standardEnglishCharacterSet = StandardRuleSets.English;
      const standardEnglishCharacterChecker: DiagnosticProvider =
        standardEnglishCharacterSet.createSelectedDiagnosticProviders(localizer, stubDocumentManager, [
          RuleType.AllowedCharacters,
        ])[0];
      await standardEnglishCharacterChecker.init();
      await localizer.init();

      expect(await standardEnglishCharacterChecker.getDiagnostics('')).toEqual([]);
    });

    it('produces no output for standard English allowed characters', async () => {
      const localizer: Localizer = new Localizer();
      const standardEnglishCharacterSet = StandardRuleSets.English;
      const standardEnglishCharacterChecker: DiagnosticProvider =
        standardEnglishCharacterSet.createSelectedDiagnosticProviders(localizer, stubDocumentManager, [
          RuleType.AllowedCharacters,
        ])[0];
      await standardEnglishCharacterChecker.init();
      await localizer.init();

      expect(await standardEnglishCharacterChecker.getDiagnostics('Four score, and seven(!!!) years ago?')).toEqual([]);
      expect(await standardEnglishCharacterChecker.getDiagnostics('"4 Sc0r3;“ \tand\r’ 7 YRS ago: \n')).toEqual([]);
      expect(await standardEnglishCharacterChecker.getDiagnostics('ALL UPPERCASE TEXT')).toEqual([]);
      expect(await standardEnglishCharacterChecker.getDiagnostics('all lowercase text')).toEqual([]);
      expect(await standardEnglishCharacterChecker.getDiagnostics(' \t\n\r0123456789!()-:;\'",./?')).toEqual([]);
    });

    it('produces Diagnostics for disallowed ASCII characters', async () => {
      const testEnv: TestEnvironment = TestEnvironment.createWithStandardEnglishCharacters();

      const localizer: Localizer = new Localizer();
      const standardEnglishCharacterSet = StandardRuleSets.English;
      const standardEnglishCharacterChecker: DiagnosticProvider =
        standardEnglishCharacterSet.createSelectedDiagnosticProviders(localizer, stubDocumentManager, [
          RuleType.AllowedCharacters,
        ])[0];
      await standardEnglishCharacterChecker.init();
      await localizer.init();

      expect(await standardEnglishCharacterChecker.getDiagnostics('&{+$')).toEqual([
        testEnv.createExpectedDiagnostic('&amp;', 0, 1),
        testEnv.createExpectedDiagnostic('{', 1, 2),
        testEnv.createExpectedDiagnostic('+', 2, 3),
        testEnv.createExpectedDiagnostic('$', 3, 4),
      ]);
    });

    it('produces Diagnostics for disallowed Unicode characters', async () => {
      const testEnv: TestEnvironment = TestEnvironment.createWithStandardEnglishCharacters();

      const localizer: Localizer = new Localizer();
      const standardEnglishCharacterSet = StandardRuleSets.English;
      const standardEnglishCharacterChecker: DiagnosticProvider =
        standardEnglishCharacterSet.createSelectedDiagnosticProviders(localizer, stubDocumentManager, [
          RuleType.AllowedCharacters,
        ])[0];
      await standardEnglishCharacterChecker.init();
      await localizer.init();

      // confusable characters
      expect(await standardEnglishCharacterChecker.getDiagnostics('аᖯ𝐜𝖽ｅ')).toEqual([
        testEnv.createExpectedDiagnostic('а', 0, 1),
        testEnv.createExpectedDiagnostic('ᖯ', 1, 2),
        testEnv.createExpectedDiagnostic('𝐜', 2, 4),
        testEnv.createExpectedDiagnostic('𝖽', 4, 6),
        testEnv.createExpectedDiagnostic('ｅ', 6, 7),
      ]);

      // other seemingly plausible characters
      expect(await standardEnglishCharacterChecker.getDiagnostics('‟″á×ꭗﬁ')).toEqual([
        testEnv.createExpectedDiagnostic('‟', 0, 1),
        testEnv.createExpectedDiagnostic('″', 1, 2),
        testEnv.createExpectedDiagnostic('á', 2, 3),
        testEnv.createExpectedDiagnostic('×', 3, 4),
        testEnv.createExpectedDiagnostic('ꭗ', 4, 5),
        testEnv.createExpectedDiagnostic('ﬁ', 5, 6),
      ]);
    });
  });
});

describe('ScriptureDocument tests', () => {
  it('produces no errors for well-formed text', async () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithStandardEnglishCharacters();
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
      \\v 1 Now Abraham was old, well advanced in years. And the Lord had blessed Abraham in all things.`,
    );

    expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics(scriptureDocument.getText())).toEqual([]);
  });

  it('identifies disallowed characters in verse text', async () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithStandardEnglishCharacters();
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
      \\v 1 The servant% said to him, “Perhaps the woman may not be ‘willing to follow me to this land. Must I then take your son back to the land from which you came?”`,
    );

    expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics(scriptureDocument.getText())).toEqual([
      testEnv.createExpectedDiagnostic('%', 171, 172),
    ]);
  });

  it('identifies disallowed characters that occur in non-verse portions', async () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithStandardEnglishCharacters();
    await testEnv.init();

    const scriptureDocument: ScriptureDocument = testEnv.createScriptureDocument(
      `\\id GEN
      \\toc3 G*n
      \\toc2 Gene$is
      \\toc1 Genesis
      \\mt2 Book @f
      \\mt1 Genesis
      \\c 1
      \\s |saac & Rebekah
      \\p
      \\v 1 The servant said to him, “Perhaps the woman may not be willing to follow me to this land. Must I then take your son back to the land from which you came?”`,
    );

    expect(testEnv.allowedCharacterIssueFinder.produceDiagnostics(scriptureDocument.getText())).toEqual([
      testEnv.createExpectedDiagnostic('*', 21, 22),
      testEnv.createExpectedDiagnostic('$', 40, 41),
      testEnv.createExpectedDiagnostic('@', 80, 81),
      testEnv.createExpectedDiagnostic('|', 122, 123),
      testEnv.createExpectedDiagnostic('&amp;', 128, 129),
    ]);
  });
});

class TestEnvironment {
  private readonly allowedCharacterIssueFinderLocalizer: Localizer;
  private readonly allowedCharacterCheckerLocalizer: Localizer;

  readonly allowedCharacterChecker: AllowedCharacterChecker;
  readonly allowedCharacterIssueFinder;

  private readonly scriptureDocumentFactory: UsfmDocumentFactory;

  constructor(
    private readonly allowedCharacterSet: AllowedCharacterSet,
    private readonly customLocalizer?: Localizer,
  ) {
    this.allowedCharacterIssueFinderLocalizer = this.createDefaultLocalizer();

    const stubDiagnosticFactory: DiagnosticFactory = new DiagnosticFactory(
      'allowed-character-set-checker',
      new StubSingleLineTextDocument(''),
    );

    this.allowedCharacterIssueFinder = new _privateTestingClasses.AllowedCharacterIssueFinder(
      this.customLocalizer ?? this.allowedCharacterIssueFinderLocalizer,
      stubDiagnosticFactory,
      allowedCharacterSet,
    );

    this.allowedCharacterCheckerLocalizer = new Localizer();

    this.allowedCharacterChecker = new AllowedCharacterChecker(
      this.customLocalizer ?? this.allowedCharacterCheckerLocalizer,
      stubDocumentManager,
      allowedCharacterSet,
    );

    const stylesheet = new UsfmStylesheet('usfm.sty');
    this.scriptureDocumentFactory = new UsfmDocumentFactory(stylesheet);
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
    await this.allowedCharacterChecker.init();
    await this.allowedCharacterCheckerLocalizer.init();
    await this.allowedCharacterIssueFinderLocalizer.init();
    await this.customLocalizer?.init();
  }

  static createWithStandardEnglishCharacters(): TestEnvironment {
    return new TestEnvironment(
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

  createScriptureDocument(usfm: string): ScriptureDocument {
    return this.scriptureDocumentFactory.create('test-uri', 'usfm', 1, usfm);
  }
}
