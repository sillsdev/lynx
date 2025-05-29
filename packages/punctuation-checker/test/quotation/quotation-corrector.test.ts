import {
  DocumentManager,
  Position,
  ScriptureDocument,
  TextDocument,
  TextDocumentFactory,
  TextEditFactory,
} from '@sillsdev/lynx';
import { UsfmDocumentFactory, UsfmEditFactory } from '@sillsdev/lynx-usfm';
import { UsfmStylesheet } from '@sillsdev/machine/corpora';
import { describe, expect, it } from 'vitest';

import { QuotationConfig } from '../../src/quotation/quotation-config';
import { QuotationCorrector } from '../../src/quotation/quotation-corrector';
import { StringContextMatcher } from '../../src/utils';
import { StubScriptureDocumentManager, StubTextDocumentManager } from '../test-utils';

describe('Text quote correction tests', () => {
  it('produces no output for text with no unambiguous quotes', async () => {
    const testEnv: TextTestEnvironment = TextTestEnvironment.createWithFullEnglishQuotes();
    const arbitraryPosition: Position = { line: 0, character: 0 };
    const arbitraryCharacter = 'a';

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('Once upon a time...', arbitraryPosition, arbitraryCharacter),
    ).toBeUndefined();

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        '\u201COnce upon a time...\u201D',
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toBeUndefined();

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        '\u201COnce upon a \u2018time\u2019...\u201D',
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toBeUndefined();
  });

  it('corrects ambiguous quotation marks', async () => {
    const testEnv: TextTestEnvironment = TextTestEnvironment.createWithEnglishQuotesButNoIgnorePattern();

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('"Once upon a time...', { line: 0, character: 1 }, '"'),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 0, 1)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('"Once upon a time..."', { line: 0, character: 1 }, '"'),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 0, 1)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('"Once upon a time..."', { line: 0, character: 21 }, '"'),
    ).toEqual([testEnv.createExpectedEdit('\u201D', 20, 21)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('\u201COnce upon a time..."', { line: 0, character: 21 }, '"'),
    ).toEqual([testEnv.createExpectedEdit('\u201D', 20, 21)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('"Once upon a time...\u201D', { line: 0, character: 1 }, '"'),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 0, 1)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        "\u201CIt was the best of times, 'it was the worst of times\u2019\u201D",
        { line: 0, character: 28 },
        "'",
      ),
    ).toEqual([testEnv.createExpectedEdit('\u2018', 27, 28)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        "\u201CIt was the best of times, \u2018it was the worst of times'\u201D",
        { line: 0, character: 54 },
        "'",
      ),
    ).toEqual([testEnv.createExpectedEdit('\u2019', 53, 54)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        '\u201CIt was the best of times, \u2018it was the worst of times\u2019"',
        { line: 0, character: 55 },
        '"',
      ),
    ).toEqual([testEnv.createExpectedEdit('\u201D', 54, 55)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        '"It was the best of times, \'it was the worst of times\'"',
        { line: 0, character: 1 },
        '"',
      ),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 0, 1)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        '"It was the best of times, \'it was the worst of times\'"',
        { line: 0, character: 28 },
        "'",
      ),
    ).toEqual([testEnv.createExpectedEdit('\u2018', 27, 28)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        '"It was the best of times, \'it was the worst of times\'"',
        { line: 0, character: 54 },
        "'",
      ),
    ).toEqual([testEnv.createExpectedEdit('\u2019', 53, 54)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        '"It was the best of times, \'it was the worst of times\'"',
        { line: 0, character: 55 },
        '"',
      ),
    ).toEqual([testEnv.createExpectedEdit('\u201D', 54, 55)]);
  });

  it('does not depend on whitespace', async () => {
    const testEnv: TextTestEnvironment = TextTestEnvironment.createWithEnglishQuotesButNoIgnorePattern();

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('"Once upon a time...', { line: 0, character: 1 }, '"'),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 0, 1)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(' "Once upon a time...', { line: 0, character: 2 }, '"'),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 1, 2)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('" Once upon a time...', { line: 0, character: 1 }, '"'),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 0, 1)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('Once upon a time..."', { line: 0, character: 20 }, '"'),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 19, 20)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('\u201COnce upon a time..."', { line: 0, character: 21 }, '"'),
    ).toEqual([testEnv.createExpectedEdit('\u201D', 20, 21)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('\u201COnce upon a time"', { line: 0, character: 18 }, '"'),
    ).toEqual([testEnv.createExpectedEdit('\u201D', 17, 18)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('\u201COnce upon a time" ', { line: 0, character: 18 }, '"'),
    ).toEqual([testEnv.createExpectedEdit('\u201D', 17, 18)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('\u201COnce upon a time "', { line: 0, character: 19 }, '"'),
    ).toEqual([testEnv.createExpectedEdit('\u201D', 18, 19)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('Once" upon a time "there was', { line: 0, character: 5 }, '"'),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 4, 5)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('Once" upon a time "there was', { line: 0, character: 19 }, '"'),
    ).toEqual([testEnv.createExpectedEdit('\u201D', 18, 19)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        "\u201COnce upon' a time there \u2019was\u201D",
        { line: 0, character: 11 },
        "'",
      ),
    ).toEqual([testEnv.createExpectedEdit('\u2018', 10, 11)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        "\u201COnce upon 'a time there \u2019was\u201D",
        { line: 0, character: 12 },
        "'",
      ),
    ).toEqual([testEnv.createExpectedEdit('\u2018', 11, 12)]);
  });

  it('does not depend on the character passed', async () => {
    const testEnv: TextTestEnvironment = TextTestEnvironment.createWithFullEnglishQuotes();

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('It was the "best of times', { line: 0, character: 12 }, 'c'),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 11, 12)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        'It was the "best of times',
        { line: 0, character: 12 },
        '\u201D',
      ),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 11, 12)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        'It was the "best of times',
        { line: 0, character: 12 },
        '\u201C',
      ),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 11, 12)]);
  });

  it('adheres to the QuotationConfig', async () => {
    const testEnv: TextTestEnvironment = TextTestEnvironment.createWithAlternativeAmbiguousQuotes();

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('Once +upon a time', { line: 0, character: 6 }, '+'),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 5, 6)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('Once +upon- a time-+', { line: 0, character: 6 }, '+'),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 5, 6)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('Once +upon- a time-+', { line: 0, character: 11 }, '-'),
    ).toEqual([testEnv.createExpectedEdit('\u2018', 10, 11)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('Once +upon- a time-+', { line: 0, character: 19 }, '-'),
    ).toEqual([testEnv.createExpectedEdit('\u2019', 18, 19)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('Once +upon- a time-+', { line: 0, character: 20 }, '+'),
    ).toEqual([testEnv.createExpectedEdit('\u201D', 19, 20)]);
  });

  it('does not produce corrections when the user might be typing an ignored pattern (i.e. an apostrophe)', async () => {
    const testEnv: TextTestEnvironment = TextTestEnvironment.createWithFullEnglishQuotes();

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('It was the best" of times', { line: 0, character: 16 }, '"'),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 15, 16)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits("It was the best' of times", { line: 0, character: 16 }, "'"),
    ).toBeUndefined();

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits("It was the best ' of times", { line: 0, character: 17 }, "'"),
    ).toEqual([testEnv.createExpectedEdit('\u2018', 16, 17)]);
  });
});

describe('Scripture quote correction tests', () => {
  it('corrects ambiguous quotation marks in single ScriptureNodes', async () => {
    const testEnv: ScriptureTestEnvironment = ScriptureTestEnvironment.createWithFullEnglishQuotes();

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        '\\c 1 \\v 1 verse with \u201Cambiguous quote"',
        { line: 0, character: 38 },
        '"',
      ),
    ).toEqual([testEnv.createExpectedEdit('\u201D', 0, 37, 0, 38)]);
    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        '\\c 1 \\v 1 verse with \u201Cunambiguous quote \\v 2 and verse" with',
        { line: 0, character: 55 },
        '"',
      ),
    ).toEqual([testEnv.createExpectedEdit('\u201D', 0, 54, 0, 55)]);
    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        `\\c 1
         \\v 1 verse with \u201Cambiguous quote"`,
        { line: 1, character: 42 },
        '"',
      ),
    ).toEqual([testEnv.createExpectedEdit('\u201D', 1, 41, 1, 42)]);
    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        '\\toc "book name \\c 1 \\v 1 verse text',
        { line: 0, character: 6 },
        '"',
      ),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 0, 5, 0, 6)]);
    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        '\\toc \u201Cbook name \\c 1 \\v 1 verse\u201D text',
        { line: 0, character: 6 },
        '"',
      ),
    ).toEqual([]);
  });

  it('corrects multiple ambiguous quotation marks in a single ScriptureNode', async () => {
    const testEnv: ScriptureTestEnvironment = ScriptureTestEnvironment.createWithFullEnglishQuotes();

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        '\\c 1 \\v 1 verse with "ambiguous quotes"',
        { line: 0, character: 22 },
        '"',
      ),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 0, 21, 0, 22)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        '\\c 1 \\v 1 verse with "ambiguous quotes"',
        { line: 0, character: 39 },
        '"',
      ),
    ).toEqual([testEnv.createExpectedEdit('\u201D', 0, 38, 0, 39)]);
  });

  it('corrects ambiguous quotation marks in quotes stretching across multiple ScriptureNodes', async () => {
    const testEnv: ScriptureTestEnvironment = ScriptureTestEnvironment.createWithFullEnglishQuotes();

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        `\\c 1
         \\v 1 verses with "ambiguous
         \\v 2 quotes" and
         \\v 3 another verse at the end`,
        { line: 1, character: 27 },
        '"',
      ),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 1, 26, 1, 27)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        `\\c 1
         \\v 1 verses with "ambiguous
         \\v 2 quotes" and
         \\v 3 another verse at the end`,
        { line: 2, character: 21 },
        '"',
      ),
    ).toEqual([testEnv.createExpectedEdit('\u201D', 2, 20, 2, 21)]);
  });
});

class TextTestEnvironment {
  readonly quotationCorrector: QuotationCorrector<TextDocument>;

  private constructor(private readonly quotationConfig: QuotationConfig) {
    const stubDocumentManager: DocumentManager<TextDocument> = new StubTextDocumentManager(new TextDocumentFactory());
    this.quotationCorrector = new QuotationCorrector<TextDocument>(
      stubDocumentManager,
      new TextEditFactory(),
      quotationConfig,
    );
  }

  static createWithFullEnglishQuotes(): TextTestEnvironment {
    return new TextTestEnvironment(
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
            .setRightContext(/(^[ \n,.:;]|^$)/)
            .build(),
        )
        .build(),
    );
  }

  static createWithEnglishQuotesButNoIgnorePattern(): TextTestEnvironment {
    return new TextTestEnvironment(
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
        .mapAmbiguousQuotationMark('"', '\u201C')
        .mapAmbiguousQuotationMark('"', '\u201D')
        .mapAmbiguousQuotationMark("'", '\u2018')
        .mapAmbiguousQuotationMark("'", '\u2019')
        .build(),
    );
  }

  static createWithAlternativeAmbiguousQuotes(): TextTestEnvironment {
    return new TextTestEnvironment(
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
        .mapAmbiguousQuotationMark('+', '\u201C')
        .mapAmbiguousQuotationMark('+', '\u201D')
        .mapAmbiguousQuotationMark('-', '\u2018')
        .mapAmbiguousQuotationMark('-', '\u2019')
        .build(),
    );
  }

  createExpectedEdit(character: string, start: number, end: number) {
    return {
      range: {
        start: { line: 0, character: start },
        end: { line: 0, character: end },
      },
      newText: character,
    };
  }
}

class ScriptureTestEnvironment {
  readonly quotationCorrector: QuotationCorrector<ScriptureDocument>;

  private constructor(private readonly quotationConfig: QuotationConfig) {
    const stylesheet = new UsfmStylesheet('usfm.sty');
    const stubDocumentManager: DocumentManager<ScriptureDocument> = new StubScriptureDocumentManager(
      new UsfmDocumentFactory(stylesheet),
    );
    this.quotationCorrector = new QuotationCorrector<ScriptureDocument>(
      stubDocumentManager,
      new UsfmEditFactory(stylesheet),
      quotationConfig,
    );
  }

  static createWithFullEnglishQuotes(): ScriptureTestEnvironment {
    return new ScriptureTestEnvironment(
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
        .mapAmbiguousQuotationMark('"', '\u201C')
        .mapAmbiguousQuotationMark('"', '\u201D')
        .mapAmbiguousQuotationMark("'", '\u2018')
        .mapAmbiguousQuotationMark("'", '\u2019')
        .build(),
    );
  }

  static createWithAlternativeAmbiguousQuotes(): ScriptureTestEnvironment {
    return new ScriptureTestEnvironment(
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
        .mapAmbiguousQuotationMark('+', '\u201C')
        .mapAmbiguousQuotationMark('+', '\u201D')
        .mapAmbiguousQuotationMark('-', '\u2018')
        .mapAmbiguousQuotationMark('-', '\u2019')
        .build(),
    );
  }

  createExpectedEdit(
    character: string,
    startLine: number,
    startCharacter: number,
    endLine: number,
    endCharacter: number,
  ) {
    return {
      range: {
        start: { line: startLine, character: startCharacter },
        end: { line: endLine, character: endCharacter },
      },
      newText: character,
    };
  }
}
