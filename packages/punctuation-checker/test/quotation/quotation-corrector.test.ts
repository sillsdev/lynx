import { DocumentManager, Position, ScriptureDocument, TextDocument, TextDocumentFactory } from '@sillsdev/lynx';
import { describe, expect, it } from 'vitest';
import { UsfmStylesheet } from '@sillsdev/machine/corpora';

import { QuotationConfig } from '../../src/quotation/quotation-config';
import { QuotationCorrector } from '../../src/quotation/quotation-corrector';
import { StubScriptureDocumentManager, StubTextDocumentManager } from '../test-utils';
import { UsfmDocumentFactory } from '@sillsdev/lynx-usfm';

describe('Text quote correction tests', () => {
  it('produces no output for text with no unambiguous quotes', async () => {
    const testEnv: TextTestEnvironment = TextTestEnvironment.createWithFullEnglishQuotes();
    const arbitraryPosition: Position = { line: 0, character: 0 };
    const arbitraryCharacter = 'a';

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('Once upon a time...', arbitraryPosition, arbitraryCharacter),
    ).toEqual(undefined);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        '\u201COnce upon a time...\u201D',
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toEqual(undefined);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        '\u201COnce upon a \u2018time\u2019...\u201D',
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toEqual(undefined);
  });

  it('corrects ambiguous quotation marks', async () => {
    const testEnv: TextTestEnvironment = TextTestEnvironment.createWithFullEnglishQuotes();
    const arbitraryPosition: Position = { line: 0, character: 0 };
    const arbitraryCharacter = 'a';

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('"Once upon a time...', arbitraryPosition, arbitraryCharacter),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 0, 1)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('"Once upon a time..."', arbitraryPosition, arbitraryCharacter),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 0, 1), testEnv.createExpectedEdit('\u201D', 20, 21)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        '\u201COnce upon a time..."',
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toEqual([testEnv.createExpectedEdit('\u201D', 20, 21)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        '"Once upon a time...\u201D',
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 0, 1)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        "\u201CIt was the best of times, 'it was the worst of times\u2019\u201D",
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toEqual([testEnv.createExpectedEdit('\u2018', 27, 28)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        "\u201CIt was the best of times, \u2018it was the worst of times'\u201D",
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toEqual([testEnv.createExpectedEdit('\u2019', 53, 54)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        '\u201CIt was the best of times, \u2018it was the worst of times\u2019"',
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toEqual([testEnv.createExpectedEdit('\u201D', 54, 55)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        '"It was the best of times, \'it was the worst of times\'"',
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toEqual([
      testEnv.createExpectedEdit('\u201C', 0, 1),
      testEnv.createExpectedEdit('\u2018', 27, 28),
      testEnv.createExpectedEdit('\u2019', 53, 54),
      testEnv.createExpectedEdit('\u201D', 54, 55),
    ]);
  });

  it('does not depend on whitespace', async () => {
    const testEnv: TextTestEnvironment = TextTestEnvironment.createWithFullEnglishQuotes();
    const arbitraryPosition: Position = { line: 0, character: 0 };
    const arbitraryCharacter = 'a';

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('"Once upon a time...', arbitraryPosition, arbitraryCharacter),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 0, 1)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(' "Once upon a time...', arbitraryPosition, arbitraryCharacter),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 1, 2)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('" Once upon a time...', arbitraryPosition, arbitraryCharacter),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 0, 1)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('Once upon a time..."', arbitraryPosition, arbitraryCharacter),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 19, 20)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        '\u201COnce upon a time..."',
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toEqual([testEnv.createExpectedEdit('\u201D', 20, 21)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('\u201COnce upon a time"', arbitraryPosition, arbitraryCharacter),
    ).toEqual([testEnv.createExpectedEdit('\u201D', 17, 18)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        '\u201COnce upon a time" ',
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toEqual([testEnv.createExpectedEdit('\u201D', 17, 18)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        '\u201COnce upon a time "',
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toEqual([testEnv.createExpectedEdit('\u201D', 18, 19)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        'Once" upon a time "there was',
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 4, 5), testEnv.createExpectedEdit('\u201D', 18, 19)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        "\u201COnce upon' a time there \u2019was\u201D",
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toEqual([testEnv.createExpectedEdit('\u2018', 10, 11)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        "\u201COnce upon 'a time there \u2019was\u201D",
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toEqual([testEnv.createExpectedEdit('\u2018', 11, 12)]);
  });

  it('does not depend on the position or character passed', async () => {
    const testEnv: TextTestEnvironment = TextTestEnvironment.createWithFullEnglishQuotes();

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('It was the "best of times', { line: 0, character: 10 }, 'c'),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 11, 12)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('It was the "best of times', { line: 10, character: 0 }, '"'),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 11, 12)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        'It was the "best of times',
        { line: 25, character: 35 },
        '\u201D',
      ),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 11, 12)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        'It was the "best of times',
        { line: 250, character: 350 },
        '\u201C',
      ),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 11, 12)]);
  });

  it('adheres to the QuotationConfig', async () => {
    const testEnv: TextTestEnvironment = TextTestEnvironment.createWithAlternativeAmbiguousQuotes();
    const arbitraryPosition: Position = { line: 0, character: 0 };
    const arbitraryCharacter = 'a';

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('Once +upon a time', arbitraryPosition, arbitraryCharacter),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 5, 6)]);

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits('Once +upon- a time-+', arbitraryPosition, arbitraryCharacter),
    ).toEqual([
      testEnv.createExpectedEdit('\u201C', 5, 6),
      testEnv.createExpectedEdit('\u2018', 10, 11),
      testEnv.createExpectedEdit('\u2019', 18, 19),
      testEnv.createExpectedEdit('\u201D', 19, 20),
    ]);
  });
});

describe('Scripture quote correction tests', () => {
  it('corrects ambiguous quotation marks in single ScriptureNodes', async () => {
    const testEnv: ScriptureTestEnvironment = ScriptureTestEnvironment.createWithFullEnglishQuotes();
    const arbitraryPosition: Position = { line: 0, character: 0 };
    const arbitraryCharacter = 'a';

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        '\\c 1 \\v 1 verse with \u201Cambiguous quote"',
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toEqual([testEnv.createExpectedEdit('\u201D', 0, 37, 0, 38)]);
    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        '\\c 1 \\v 1 verse with \u201Cunambiguous quote \\v 2 and verse" with',
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toEqual([testEnv.createExpectedEdit('\u201D', 0, 54, 0, 55)]);
    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        `\\c 1
         \\v 1 verse with \u201Cambiguous quote"`,
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toEqual([testEnv.createExpectedEdit('\u201D', 1, 41, 1, 42)]);
    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        '\\toc "book name \\c 1 \\v 1 verse text',
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 0, 5, 0, 6)]);
    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        '\\toc \u201Cbook name \\c 1 \\v 1 verse\u201D text',
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toEqual([]);
  });

  it('corrects multiple ambiguous quotation marks in a single ScriptureNode', async () => {
    const testEnv: ScriptureTestEnvironment = ScriptureTestEnvironment.createWithFullEnglishQuotes();
    const arbitraryPosition: Position = { line: 0, character: 0 };
    const arbitraryCharacter = 'a';

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        '\\c 1 \\v 1 verse with "ambiguous quotes"',
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 0, 21, 0, 22), testEnv.createExpectedEdit('\u201D', 0, 38, 0, 39)]);
  });

  it('corrects ambiguous quotation marks in quotes stretching across multiple ScriptureNodes', async () => {
    const testEnv: ScriptureTestEnvironment = ScriptureTestEnvironment.createWithFullEnglishQuotes();
    const arbitraryPosition: Position = { line: 0, character: 0 };
    const arbitraryCharacter = 'a';

    expect(
      await testEnv.quotationCorrector.getOnTypeEdits(
        `\\c 1
         \\v 1 verses with "ambiguous
         \\v 2 quotes" and
         \\v 3 another verse at the end`,
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toEqual([testEnv.createExpectedEdit('\u201C', 1, 26, 1, 27), testEnv.createExpectedEdit('\u201D', 2, 20, 2, 21)]);
  });
});

class TextTestEnvironment {
  readonly quotationCorrector: QuotationCorrector;

  private constructor(private readonly quotationConfig: QuotationConfig) {
    const stubDocumentManager: DocumentManager<TextDocument> = new StubTextDocumentManager(new TextDocumentFactory());
    this.quotationCorrector = new QuotationCorrector(stubDocumentManager, quotationConfig);
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
  readonly quotationCorrector: QuotationCorrector;

  private constructor(private readonly quotationConfig: QuotationConfig) {
    const stylesheet = new UsfmStylesheet('usfm.sty');
    const stubDocumentManager: DocumentManager<ScriptureDocument> = new StubScriptureDocumentManager(
      new UsfmDocumentFactory(stylesheet),
    );
    this.quotationCorrector = new QuotationCorrector(stubDocumentManager, quotationConfig);
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
