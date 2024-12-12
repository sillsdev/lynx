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

const defaultLocalizer: Localizer = new Localizer();
defaultLocalizer.addNamespace('allowedCharacters', (_language: string) => {
  return {
    diagnosticMessagesByCode: {
      'disallowed-character': "The character '{{character}}' is not typically used in this language.",
    },
  };
});
await defaultLocalizer.init();

// passing an empty document is fine here since we don't use getText()
const stubDiagnosticFactory: DiagnosticFactory = new DiagnosticFactory(
  'allowed-character-set-checker',
  new StubSingleLineTextDocument(''),
);

function createExpectedDiagnostic(character: string, startOffset: number, endOffset: number): Diagnostic {
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

describe('AllowedCharacterIssueFinder tests', () => {
  describe('Diagnostics are created only for characters not on the whitelist', () => {
    describe('Simple cases', () => {
      const vowelCharacterSet: AllowedCharacterSet = new CharacterRegexWhitelist(/[aeiouAEIOU]/);
      const vowelChecker = new _privateTestingClasses.AllowedCharacterIssueFinder(
        defaultLocalizer,
        stubDiagnosticFactory,
        vowelCharacterSet,
      );

      it('produces no output for empty strings', () => {
        expect(vowelChecker.produceDiagnostics('')).toEqual([]);
      });

      it('produces Diagnostics for disallowed ASCII characters', () => {
        expect(vowelChecker.produceDiagnostics('g')).toEqual([createExpectedDiagnostic('g', 0, 1)]);
        expect(vowelChecker.produceDiagnostics('bV')).toEqual([
          createExpectedDiagnostic('b', 0, 1),
          createExpectedDiagnostic('V', 1, 2),
        ]);
        expect(vowelChecker.produceDiagnostics('aaauoieAEOOOUI')).toEqual([]);
        expect(vowelChecker.produceDiagnostics('aaautoieAEOOOMUI')).toEqual([
          createExpectedDiagnostic('t', 4, 5),
          createExpectedDiagnostic('M', 13, 14),
        ]);
      });
    });

    describe('for basic Unicode', () => {
      it('correctly handles strings with Unicode-escaped ASCII characters', () => {
        const asciiVowelCharacterSet: AllowedCharacterSet = new CharacterRegexWhitelist(/[aeiouAEIOU]/);
        const asciiVowelChecker = new _privateTestingClasses.AllowedCharacterIssueFinder(
          defaultLocalizer,
          stubDiagnosticFactory,
          asciiVowelCharacterSet,
        );

        expect(
          asciiVowelChecker.produceDiagnostics(
            '\u0061\u0061\u0061\u0075\u006F\u0069\u0065\u0041\u0045\u004F\u004F\u004F\u0055\u0049',
          ),
        ).toEqual([]);
        expect(asciiVowelChecker.produceDiagnostics('\u0062\u0056')).toEqual([
          createExpectedDiagnostic('b', 0, 1),
          createExpectedDiagnostic('V', 1, 2),
        ]);
      });

      it('correctly handles Unicode-escaped ASCII characters in the whitelist', () => {
        const unicodeVowelCharacterSet: AllowedCharacterSet = new CharacterRegexWhitelist(
          /[\u0061\u0065\u0069\u006F\u0075\u0041\u0045\u0049\u004F\u0055]/,
        );
        const unicodeVowelIssueFinder = new _privateTestingClasses.AllowedCharacterIssueFinder(
          defaultLocalizer,
          stubDiagnosticFactory,
          unicodeVowelCharacterSet,
        );

        expect(unicodeVowelIssueFinder.produceDiagnostics('aaauoieAEOOOUI')).toEqual([]);
        expect(
          unicodeVowelIssueFinder.produceDiagnostics(
            '\u0061\u0061\u0061\u0075\u006F\u0069\u0065\u0041\u0045\u004F\u004F\u004F\u0055\u0049',
          ),
        ).toEqual([]);
        expect(unicodeVowelIssueFinder.produceDiagnostics('\u0062\u0056')).toEqual([
          createExpectedDiagnostic('b', 0, 1),
          createExpectedDiagnostic('V', 1, 2),
        ]);
        expect(unicodeVowelIssueFinder.produceDiagnostics('bV')).toEqual([
          createExpectedDiagnostic('b', 0, 1),
          createExpectedDiagnostic('V', 1, 2),
        ]);
      });

      it('correctly handles non-ASCII Unicode ranges in the whitelist', () => {
        const nonASCIICharacterSet: AllowedCharacterSet = new CharacterRegexWhitelist(/[\u2200-\u22FF]/);
        const nonASCIICharacterIssueFinder = new _privateTestingClasses.AllowedCharacterIssueFinder(
          defaultLocalizer,
          stubDiagnosticFactory,
          nonASCIICharacterSet,
        );

        expect(nonASCIICharacterIssueFinder.produceDiagnostics('≤⊕∴∀∂∯')).toEqual([]);
        expect(nonASCIICharacterIssueFinder.produceDiagnostics('\u2264\u2295\u2234\u2200\u2202\u222F')).toEqual([]);

        expect(nonASCIICharacterIssueFinder.produceDiagnostics('≤⊕∴∀A∯')).toEqual([
          createExpectedDiagnostic('A', 4, 5),
        ]);
        expect(nonASCIICharacterIssueFinder.produceDiagnostics('≤⊕∴∀∯⨕')).toEqual([
          createExpectedDiagnostic('⨕', 5, 6),
        ]);
      });
    });

    describe('for complex Unicode', () => {
      it('correctly handles Unicode categories in the whitelist regex', () => {
        const unicodeCategoryCharacterSet: AllowedCharacterSet = new CharacterRegexWhitelist(
          /[\p{General_Category=Math_Symbol}]/u,
        );
        const unicodeCategoryIssueFinder = new _privateTestingClasses.AllowedCharacterIssueFinder(
          defaultLocalizer,
          stubDiagnosticFactory,
          unicodeCategoryCharacterSet,
        );

        expect(unicodeCategoryIssueFinder.produceDiagnostics('≤⊕∴∀∂∯')).toEqual([]);
        expect(unicodeCategoryIssueFinder.produceDiagnostics('\u2264\u2295\u2234\u2200\u2202\u222F')).toEqual([]);
        expect(unicodeCategoryIssueFinder.produceDiagnostics('≤⊕∴∀A∯')).toEqual([createExpectedDiagnostic('A', 4, 5)]);
        expect(unicodeCategoryIssueFinder.produceDiagnostics('≤⊕∴∀∯ච')).toEqual([createExpectedDiagnostic('ච', 5, 6)]);
      });

      it('correctly handles Unicode scripts in the whitelist regex', () => {
        const unicodeScriptCharacterSet: AllowedCharacterSet = new CharacterRegexWhitelist(/[\p{Script=Hebrew}]/u);
        const unicodeScriptIssueFinder = new _privateTestingClasses.AllowedCharacterIssueFinder(
          defaultLocalizer,
          stubDiagnosticFactory,
          unicodeScriptCharacterSet,
        );

        expect(unicodeScriptIssueFinder.produceDiagnostics('לִינקס')).toEqual([]);
        expect(unicodeScriptIssueFinder.produceDiagnostics('לִינקסקּ')).toEqual([]);
        expect(unicodeScriptIssueFinder.produceDiagnostics('\u05DC\u05B4\u05D9\u05E0\u05E7\u05E1')).toEqual([]);

        // Mathematical version of aleph
        expect(unicodeScriptIssueFinder.produceDiagnostics('לִינקסℵ')).toEqual([createExpectedDiagnostic('ℵ', 6, 7)]);

        expect(unicodeScriptIssueFinder.produceDiagnostics('לִxינקס')).toEqual([createExpectedDiagnostic('x', 2, 3)]);
      });

      describe('correctly handles surrogate pairs and characters outside the basic multilingual plane', () => {
        it('handles ranges of characters with U+10000 and above', () => {
          const extendedUnicodeCharacterSet: AllowedCharacterSet = new CharacterRegexWhitelist(
            /[\u{1F600}-\u{1F64F}]/u,
          );
          const extendedUnicodeIssueFinder = new _privateTestingClasses.AllowedCharacterIssueFinder(
            defaultLocalizer,
            stubDiagnosticFactory,
            extendedUnicodeCharacterSet,
          );

          // all three of these strings should be equivalent
          expect(extendedUnicodeIssueFinder.produceDiagnostics('😀😶🙅🙏')).toEqual([]);
          expect(extendedUnicodeIssueFinder.produceDiagnostics('\u{1F600}\u{1F636}\u{1F645}\u{1F64F}')).toEqual([]);
          expect(
            extendedUnicodeIssueFinder.produceDiagnostics('\uD83D\uDE00\uD83D\uDE36\uD83D\uDE45\uD83D\uDE4F'),
          ).toEqual([]);

          expect(extendedUnicodeIssueFinder.produceDiagnostics('🙓😀m🚤')).toEqual([
            createExpectedDiagnostic('🙓', 0, 2),
            createExpectedDiagnostic('m', 4, 5),
            createExpectedDiagnostic('🚤', 5, 7),
          ]);
          expect(extendedUnicodeIssueFinder.produceDiagnostics('\u{1F653}\u{1F600}\u006D\u{1F6A4}')).toEqual([
            createExpectedDiagnostic('🙓', 0, 2),
            createExpectedDiagnostic('m', 4, 5),
            createExpectedDiagnostic('🚤', 5, 7),
          ]);
          expect(extendedUnicodeIssueFinder.produceDiagnostics('\uD83D\uDE53\uD83D\uDE00m\uD83D\uDEA4')).toEqual([
            createExpectedDiagnostic('🙓', 0, 2),
            createExpectedDiagnostic('m', 4, 5),
            createExpectedDiagnostic('🚤', 5, 7),
          ]);
        });

        it('correctly handles explicit non-BMP characters', () => {
          const explicitExtendedUnicodeCharacterSet: AllowedCharacterSet = new CharacterRegexWhitelist(
            /[😀😁😂😃😴😵😶😷🙄🙅🙆🙇🙌🙍🙎🙏]/u,
          );
          const explicitExtendedUnicodeIssueFinder = new _privateTestingClasses.AllowedCharacterIssueFinder(
            defaultLocalizer,
            stubDiagnosticFactory,
            explicitExtendedUnicodeCharacterSet,
          );

          expect(explicitExtendedUnicodeIssueFinder.produceDiagnostics('😀😶🙅🙏')).toEqual([]);
          expect(explicitExtendedUnicodeIssueFinder.produceDiagnostics('\u{1F600}\u{1F636}\u{1F645}\u{1F64F}')).toEqual(
            [],
          );
          expect(
            explicitExtendedUnicodeIssueFinder.produceDiagnostics('\uD83D\uDE00\uD83D\uDE36\uD83D\uDE45\uD83D\uDE4F'),
          ).toEqual([]);

          expect(explicitExtendedUnicodeIssueFinder.produceDiagnostics('🙓😀m🚤😎')).toEqual([
            createExpectedDiagnostic('🙓', 0, 2),
            createExpectedDiagnostic('m', 4, 5),
            createExpectedDiagnostic('🚤', 5, 7),
            createExpectedDiagnostic('😎', 7, 9),
          ]);
          expect(
            explicitExtendedUnicodeIssueFinder.produceDiagnostics('\u{1F653}\u{1F600}\u006D\u{1F6A4}\u{1F60E}'),
          ).toEqual([
            createExpectedDiagnostic('🙓', 0, 2),
            createExpectedDiagnostic('m', 4, 5),
            createExpectedDiagnostic('🚤', 5, 7),
            createExpectedDiagnostic('😎', 7, 9),
          ]);
          expect(
            explicitExtendedUnicodeIssueFinder.produceDiagnostics('\uD83D\uDE53\uD83D\uDE00m\uD83D\uDEA4\uD83D\uDE0E'),
          ).toEqual([
            createExpectedDiagnostic('🙓', 0, 2),
            createExpectedDiagnostic('m', 4, 5),
            createExpectedDiagnostic('🚤', 5, 7),
            createExpectedDiagnostic('😎', 7, 9),
          ]);
        });

        it('correctly handles ranges expressed with surrogate pairs', () => {
          const surrogatePairUnicodeCharacterSet: AllowedCharacterSet = new CharacterRegexWhitelist(
            /[\uD83D\uDE00-\uD83D\uDE4F]/u,
          );
          const surrogatePairIssueFinder = new _privateTestingClasses.AllowedCharacterIssueFinder(
            defaultLocalizer,
            stubDiagnosticFactory,
            surrogatePairUnicodeCharacterSet,
          );

          expect(surrogatePairIssueFinder.produceDiagnostics('😀😶🙅🙏')).toEqual([]);
          expect(surrogatePairIssueFinder.produceDiagnostics('\u{1F600}\u{1F636}\u{1F645}\u{1F64F}')).toEqual([]);
          expect(
            surrogatePairIssueFinder.produceDiagnostics('\uD83D\uDE00\uD83D\uDE36\uD83D\uDE45\uD83D\uDE4F'),
          ).toEqual([]);

          expect(surrogatePairIssueFinder.produceDiagnostics('🙓😀m🚤')).toEqual([
            createExpectedDiagnostic('🙓', 0, 2),
            createExpectedDiagnostic('m', 4, 5),
            createExpectedDiagnostic('🚤', 5, 7),
          ]);
          expect(surrogatePairIssueFinder.produceDiagnostics('\u{1F653}\u{1F600}\u006D\u{1F6A4}')).toEqual([
            createExpectedDiagnostic('🙓', 0, 2),
            createExpectedDiagnostic('m', 4, 5),
            createExpectedDiagnostic('🚤', 5, 7),
          ]);
          expect(surrogatePairIssueFinder.produceDiagnostics('\uD83D\uDE53\uD83D\uDE00m\uD83D\uDEA4')).toEqual([
            createExpectedDiagnostic('🙓', 0, 2),
            createExpectedDiagnostic('m', 4, 5),
            createExpectedDiagnostic('🚤', 5, 7),
          ]);

          // invalid surrogate pairs
          expect(surrogatePairIssueFinder.produceDiagnostics('\uD83D')).toEqual([
            createExpectedDiagnostic('\uD83D', 0, 1),
          ]);
          expect(surrogatePairIssueFinder.produceDiagnostics('\uD83D\u0061')).toEqual([
            createExpectedDiagnostic('\uD83D', 0, 1),
            createExpectedDiagnostic('a', 1, 2),
          ]);
          expect(surrogatePairIssueFinder.produceDiagnostics('\uD83D\u{1F600}')).toEqual([
            createExpectedDiagnostic('\uD83D', 0, 1),
          ]);
        });
      });
    });
  });
});

const stubDocumentManager: StubDocumentManager = new StubDocumentManager(new TextDocumentFactory());

describe('AllowedCharacterChecker tests', () => {
  it("doesn't provide any DiagnosticFixes", async () => {
    const basicCharacterSet: AllowedCharacterSet = new CharacterRegexWhitelist(/[a-zA-Z ]/);
    const basicCharacterChecker: AllowedCharacterChecker = new AllowedCharacterChecker(
      defaultLocalizer,
      stubDocumentManager,
      basicCharacterSet,
    );

    expect(
      await basicCharacterChecker.getDiagnosticFixes('Hello, _there!&%', createExpectedDiagnostic(',', 5, 6)),
    ).toEqual([]);
  });

  it('initializes its own namespace in the localizer', async () => {
    const localizer: Localizer = new Localizer();
    const basicCharacterSet: AllowedCharacterSet = new CharacterRegexWhitelist(/[a-zA-Z ]/);
    const basicCharacterChecker: AllowedCharacterChecker = new AllowedCharacterChecker(
      localizer,
      stubDocumentManager,
      basicCharacterSet,
    );
    await basicCharacterChecker.init();
    await localizer.init();

    expect(await basicCharacterChecker.getDiagnostics('Hello^there')).toEqual([createExpectedDiagnostic('^', 5, 6)]);
  });

  it('gets its messages from the localizer', async () => {
    const localizer: Localizer = new Localizer();
    localizer.addNamespace('allowedCharacters', (language: string) => {
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
    const basicCharacterSet: AllowedCharacterSet = new CharacterRegexWhitelist(/[a-zA-Z ]/);
    const basicCharacterChecker: AllowedCharacterChecker = new AllowedCharacterChecker(
      localizer,
      stubDocumentManager,
      basicCharacterSet,
    );
    await basicCharacterChecker.init();
    await localizer.init();

    expect(await basicCharacterChecker.getDiagnostics('Hello^there')).toEqual([
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

    await localizer.changeLanguage('es');
    expect(await basicCharacterChecker.getDiagnostics('Hello^there')).toEqual([
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
    const basicCharacterSet: AllowedCharacterSet = new CharacterRegexWhitelist(/[a-zA-Z ]/);
    const basicCharacterChecker: AllowedCharacterChecker = new AllowedCharacterChecker(
      defaultLocalizer,
      stubDocumentManager,
      basicCharacterSet,
    );

    it('correctly handles ASCII characters', async () => {
      expect(await basicCharacterChecker.getDiagnostics('hello there')).toEqual([]);
      expect(await basicCharacterChecker.getDiagnostics('hello there!')).toEqual([
        createExpectedDiagnostic('!', 11, 12),
      ]);
    });
    it('correctly handles Unicode characters', async () => {
      expect(await basicCharacterChecker.getDiagnostics('h𝕖llo ther𝖊')).toEqual([
        createExpectedDiagnostic('𝕖', 1, 3),
        createExpectedDiagnostic('𝖊', 11, 13),
      ]);
    });
  });

  describe('with the standard English rule set', () => {
    const standardEnglishCharacterSet = StandardRuleSets.English;
    const standardEnglishCharacterChecker: DiagnosticProvider =
      standardEnglishCharacterSet.createSelectedDiagnosticProviders(defaultLocalizer, stubDocumentManager, [
        RuleType.AllowedCharacters,
      ])[0];

    it('produces no output for empty strings', async () => {
      expect(await standardEnglishCharacterChecker.getDiagnostics('')).toEqual([]);
    });

    it('produces no output for standard English allowed characters', async () => {
      expect(await standardEnglishCharacterChecker.getDiagnostics('Four score, and seven(!!!) years ago?')).toEqual([]);
      expect(await standardEnglishCharacterChecker.getDiagnostics('"4 Sc0r3;“ \tand\r’ 7 YRS ago: \n')).toEqual([]);
      expect(await standardEnglishCharacterChecker.getDiagnostics('ALL UPPERCASE TEXT')).toEqual([]);
      expect(await standardEnglishCharacterChecker.getDiagnostics('all lowercase text')).toEqual([]);
      expect(await standardEnglishCharacterChecker.getDiagnostics(' \t\n\r0123456789!()-:;\'",./?')).toEqual([]);
    });

    it('produces Diagnostics for disallowed ASCII characters', async () => {
      expect(await standardEnglishCharacterChecker.getDiagnostics('&{+$')).toEqual([
        createExpectedDiagnostic('&amp;', 0, 1),
        createExpectedDiagnostic('{', 1, 2),
        createExpectedDiagnostic('+', 2, 3),
        createExpectedDiagnostic('$', 3, 4),
      ]);
    });

    it('produces Diagnostics for disallowed Unicode characters', async () => {
      // confusable characters
      expect(await standardEnglishCharacterChecker.getDiagnostics('аᖯ𝐜𝖽ｅ')).toEqual([
        createExpectedDiagnostic('а', 0, 1),
        createExpectedDiagnostic('ᖯ', 1, 2),
        createExpectedDiagnostic('𝐜', 2, 4),
        createExpectedDiagnostic('𝖽', 4, 6),
        createExpectedDiagnostic('ｅ', 6, 7),
      ]);

      // other seemingly plausible characters
      expect(await standardEnglishCharacterChecker.getDiagnostics('‟″á×ꭗﬁ')).toEqual([
        createExpectedDiagnostic('‟', 0, 1),
        createExpectedDiagnostic('″', 1, 2),
        createExpectedDiagnostic('á', 2, 3),
        createExpectedDiagnostic('×', 3, 4),
        createExpectedDiagnostic('ꭗ', 4, 5),
        createExpectedDiagnostic('ﬁ', 5, 6),
      ]);
    });
  });
});

describe('ScriptureDocument tests', () => {
  const stylesheet = new UsfmStylesheet('usfm.sty');
  const documentFactory = new UsfmDocumentFactory(stylesheet);
  const standardAllowedCharacterSet = new CharacterRegexWhitelist(
    new CharacterClassRegexBuilder()
      .addRange('A', 'Z')
      .addRange('a', 'z')
      .addRange('0', '9')
      .addCharacters(['.', ',', '?', '/', '\\', ':', ';', '(', ')', '-', '—', '!'])
      .addCharacters(['"', "'", '\u2018', '\u2019', '\u201C', '\u201D'])
      .addCharacters([' ', '\r', '\n', '\t'])
      .build(),
  );
  const allowedCharacterIssueFinder = new _privateTestingClasses.AllowedCharacterIssueFinder(
    defaultLocalizer,
    stubDiagnosticFactory,
    standardAllowedCharacterSet,
  );

  it('produces no errors for well-formed text', () => {
    const scriptureDocument: ScriptureDocument = documentFactory.create(
      'test-uri',
      'usfm',
      1,
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

    expect(allowedCharacterIssueFinder.produceDiagnostics(scriptureDocument.getText())).toEqual([]);
  });

  it('identifies disallowed characters in verse text', () => {
    const scriptureDocument: ScriptureDocument = documentFactory.create(
      'test-uri',
      'usfm',
      1,
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

    expect(allowedCharacterIssueFinder.produceDiagnostics(scriptureDocument.getText())).toEqual([
      createExpectedDiagnostic('%', 171, 172),
    ]);
  });

  it('identifies disallowed characters that occur in non-verse portions', () => {
    const scriptureDocument: ScriptureDocument = documentFactory.create(
      'test-uri',
      'usfm',
      1,
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

    expect(allowedCharacterIssueFinder.produceDiagnostics(scriptureDocument.getText())).toEqual([
      createExpectedDiagnostic('*', 21, 22),
      createExpectedDiagnostic('$', 40, 41),
      createExpectedDiagnostic('@', 80, 81),
      createExpectedDiagnostic('|', 122, 123),
      createExpectedDiagnostic('&amp;', 128, 129),
    ]);
  });
});
