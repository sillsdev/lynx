import { DocumentManager, Position, TextDocument, TextDocumentFactory } from '@sillsdev/lynx';
import { describe, expect, it } from 'vitest';

import { QuotationConfig } from '../../src/quotation/quotation-config';
import { QuotationCorrector } from '../../src/quotation/quotation-corrector';
import { StubTextDocumentManager } from '../test-utils';

describe('QuotationCorrector tests', () => {
  it('produces no output for text with no unambiguous quotes', async () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithFullEnglishQuotes();
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
    const testEnv: TestEnvironment = TestEnvironment.createWithFullEnglishQuotes();
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
    const testEnv: TestEnvironment = TestEnvironment.createWithFullEnglishQuotes();
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
    const testEnv: TestEnvironment = TestEnvironment.createWithFullEnglishQuotes();

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
    const testEnv: TestEnvironment = TestEnvironment.createWithAlternativeAmbiguousQuotes();
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

class TestEnvironment {
  readonly quotationCorrector: QuotationCorrector;

  private constructor(private readonly quotationConfig: QuotationConfig) {
    const stubDocumentManager: DocumentManager<TextDocument> = new StubTextDocumentManager(new TextDocumentFactory());
    this.quotationCorrector = new QuotationCorrector(stubDocumentManager, quotationConfig);
  }

  static createWithFullEnglishQuotes(): TestEnvironment {
    return new TestEnvironment(
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

  static createWithAlternativeAmbiguousQuotes(): TestEnvironment {
    return new TestEnvironment(
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
