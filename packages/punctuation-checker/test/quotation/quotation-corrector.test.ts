import { DocumentManager, Position, TextDocument, TextDocumentFactory } from '@sillsdev/lynx';
import { describe, expect, it } from 'vitest';

import { QuotationConfig } from '../../src/quotation/quotation-config';
import { QuotationCorrector } from '../../src/quotation/quotation-corrector';
import { StubDocumentManager } from '../test-utils';

const stubDocumentManager: DocumentManager<TextDocument> = new StubDocumentManager(new TextDocumentFactory());

function createExpectedEdit(character: string, start: number, end: number) {
  return {
    range: {
      start: { line: 0, character: start },
      end: { line: 0, character: end },
    },
    newText: character,
  };
}

describe('QuotationCorrector tests', () => {
  it('produces no output for text with no unambiguous quotes', async () => {
    const quotationConfig: QuotationConfig = new QuotationConfig.Builder()
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
      .build();

    const quotationCorector: QuotationCorrector = new QuotationCorrector(stubDocumentManager, quotationConfig);
    const arbitraryPosition: Position = { line: 0, character: 0 };
    const arbitraryCharacter = 'a';

    expect(
      await quotationCorector.getOnTypeEdits('Once upon a time...', arbitraryPosition, arbitraryCharacter),
    ).toEqual(undefined);

    expect(
      await quotationCorector.getOnTypeEdits('\u201COnce upon a time...\u201D', arbitraryPosition, arbitraryCharacter),
    ).toEqual(undefined);

    expect(
      await quotationCorector.getOnTypeEdits(
        '\u201COnce upon a \u2018time\u2019...\u201D',
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toEqual(undefined);
  });

  it('corrects ambiguous quotation marks', async () => {
    const quotationConfig: QuotationConfig = new QuotationConfig.Builder()
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
      .build();

    const quotationCorector: QuotationCorrector = new QuotationCorrector(stubDocumentManager, quotationConfig);
    const arbitraryPosition: Position = { line: 0, character: 0 };
    const arbitraryCharacter = 'a';

    expect(
      await quotationCorector.getOnTypeEdits('"Once upon a time...', arbitraryPosition, arbitraryCharacter),
    ).toEqual([createExpectedEdit('\u201C', 0, 1)]);

    expect(
      await quotationCorector.getOnTypeEdits('"Once upon a time..."', arbitraryPosition, arbitraryCharacter),
    ).toEqual([createExpectedEdit('\u201C', 0, 1), createExpectedEdit('\u201D', 20, 21)]);

    expect(
      await quotationCorector.getOnTypeEdits('\u201COnce upon a time..."', arbitraryPosition, arbitraryCharacter),
    ).toEqual([createExpectedEdit('\u201D', 20, 21)]);

    expect(
      await quotationCorector.getOnTypeEdits('"Once upon a time...\u201D', arbitraryPosition, arbitraryCharacter),
    ).toEqual([createExpectedEdit('\u201C', 0, 1)]);

    expect(
      await quotationCorector.getOnTypeEdits(
        "\u201CIt was the best of times, 'it was the worst of times\u2019\u201D",
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toEqual([createExpectedEdit('\u2018', 27, 28)]);

    expect(
      await quotationCorector.getOnTypeEdits(
        "\u201CIt was the best of times, \u2018it was the worst of times'\u201D",
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toEqual([createExpectedEdit('\u2019', 53, 54)]);

    expect(
      await quotationCorector.getOnTypeEdits(
        '\u201CIt was the best of times, \u2018it was the worst of times\u2019"',
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toEqual([createExpectedEdit('\u201D', 54, 55)]);

    expect(
      await quotationCorector.getOnTypeEdits(
        '"It was the best of times, \'it was the worst of times\'"',
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toEqual([
      createExpectedEdit('\u201C', 0, 1),
      createExpectedEdit('\u2018', 27, 28),
      createExpectedEdit('\u2019', 53, 54),
      createExpectedEdit('\u201D', 54, 55),
    ]);
  });

  it('does not depend on whitespace', async () => {
    const quotationConfig: QuotationConfig = new QuotationConfig.Builder()
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
      .build();

    const quotationCorector: QuotationCorrector = new QuotationCorrector(stubDocumentManager, quotationConfig);
    const arbitraryPosition: Position = { line: 0, character: 0 };
    const arbitraryCharacter = 'a';

    expect(
      await quotationCorector.getOnTypeEdits('"Once upon a time...', arbitraryPosition, arbitraryCharacter),
    ).toEqual([createExpectedEdit('\u201C', 0, 1)]);

    expect(
      await quotationCorector.getOnTypeEdits(' "Once upon a time...', arbitraryPosition, arbitraryCharacter),
    ).toEqual([createExpectedEdit('\u201C', 1, 2)]);

    expect(
      await quotationCorector.getOnTypeEdits('" Once upon a time...', arbitraryPosition, arbitraryCharacter),
    ).toEqual([createExpectedEdit('\u201C', 0, 1)]);

    expect(
      await quotationCorector.getOnTypeEdits('Once upon a time..."', arbitraryPosition, arbitraryCharacter),
    ).toEqual([createExpectedEdit('\u201C', 19, 20)]);

    expect(
      await quotationCorector.getOnTypeEdits('\u201COnce upon a time..."', arbitraryPosition, arbitraryCharacter),
    ).toEqual([createExpectedEdit('\u201D', 20, 21)]);

    expect(
      await quotationCorector.getOnTypeEdits('\u201COnce upon a time"', arbitraryPosition, arbitraryCharacter),
    ).toEqual([createExpectedEdit('\u201D', 17, 18)]);

    expect(
      await quotationCorector.getOnTypeEdits('\u201COnce upon a time" ', arbitraryPosition, arbitraryCharacter),
    ).toEqual([createExpectedEdit('\u201D', 17, 18)]);

    expect(
      await quotationCorector.getOnTypeEdits('\u201COnce upon a time "', arbitraryPosition, arbitraryCharacter),
    ).toEqual([createExpectedEdit('\u201D', 18, 19)]);

    expect(
      await quotationCorector.getOnTypeEdits('Once" upon a time "there was', arbitraryPosition, arbitraryCharacter),
    ).toEqual([createExpectedEdit('\u201C', 4, 5), createExpectedEdit('\u201D', 18, 19)]);

    expect(
      await quotationCorector.getOnTypeEdits(
        "\u201COnce upon' a time there \u2019was\u201D",
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toEqual([createExpectedEdit('\u2018', 10, 11)]);

    expect(
      await quotationCorector.getOnTypeEdits(
        "\u201COnce upon 'a time there \u2019was\u201D",
        arbitraryPosition,
        arbitraryCharacter,
      ),
    ).toEqual([createExpectedEdit('\u2018', 11, 12)]);
  });

  it('does not depend on the position or character passed', async () => {
    const quotationConfig: QuotationConfig = new QuotationConfig.Builder()
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
      .build();

    const quotationCorrector: QuotationCorrector = new QuotationCorrector(stubDocumentManager, quotationConfig);

    expect(
      await quotationCorrector.getOnTypeEdits('It was the "best of times', { line: 0, character: 10 }, 'c'),
    ).toEqual([createExpectedEdit('\u201C', 11, 12)]);

    expect(
      await quotationCorrector.getOnTypeEdits('It was the "best of times', { line: 10, character: 0 }, '"'),
    ).toEqual([createExpectedEdit('\u201C', 11, 12)]);

    expect(
      await quotationCorrector.getOnTypeEdits('It was the "best of times', { line: 25, character: 35 }, '\u201D'),
    ).toEqual([createExpectedEdit('\u201C', 11, 12)]);

    expect(
      await quotationCorrector.getOnTypeEdits('It was the "best of times', { line: 250, character: 350 }, '\u201C'),
    ).toEqual([createExpectedEdit('\u201C', 11, 12)]);
  });

  it('adheres to the QuotationConfig', async () => {
    const quotationConfig: QuotationConfig = new QuotationConfig.Builder()
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
      .build();

    const quotationCorrector: QuotationCorrector = new QuotationCorrector(stubDocumentManager, quotationConfig);
    const arbitraryPosition: Position = { line: 0, character: 0 };
    const arbitraryCharacter = 'a';

    expect(await quotationCorrector.getOnTypeEdits('Once +upon a time', arbitraryPosition, arbitraryCharacter)).toEqual(
      [createExpectedEdit('\u201C', 5, 6)],
    );

    expect(
      await quotationCorrector.getOnTypeEdits('Once +upon- a time-+', arbitraryPosition, arbitraryCharacter),
    ).toEqual([
      createExpectedEdit('\u201C', 5, 6),
      createExpectedEdit('\u2018', 10, 11),
      createExpectedEdit('\u2019', 18, 19),
      createExpectedEdit('\u201D', 19, 20),
    ]);
  });
});
