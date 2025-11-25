import { describe, expect, it } from 'vitest';

import { Checkable, TextDocumentCheckable } from '../../src/checkable';
import { QuotationConfig, QuoteContinuerStyle } from '../../src/quotation/quotation-config';
import { QuotationDepth, QuotationMarkMatch } from '../../src/quotation/quotation-utils';
import { PairedPunctuationDirection, StringContextMatcher } from '../../src/utils';

describe('QuotationConfig tests', () => {
  it('enumerates the possible directions for a quotation mark', () => {
    const basicEnglishQuotationConfig: QuotationConfig = new QuotationConfig.Builder()
      .setTopLevelQuotationMarks({
        openingPunctuationMark: '\u201C',
        closingPunctuationMark: '\u201D',
      })
      .build();

    expect(basicEnglishQuotationConfig.getPossibleQuoteDirections('\u201C')).toEqual([
      PairedPunctuationDirection.Opening,
    ]);
    expect(basicEnglishQuotationConfig.getPossibleQuoteDirections('\u201D')).toEqual([
      PairedPunctuationDirection.Closing,
    ]);

    const fullEnglishQuotationConfig: QuotationConfig = new QuotationConfig.Builder()
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
      .build();

    expect(fullEnglishQuotationConfig.getPossibleQuoteDirections('\u201C')).toEqual([
      PairedPunctuationDirection.Opening,
    ]);
    expect(fullEnglishQuotationConfig.getPossibleQuoteDirections('\u201D')).toEqual([
      PairedPunctuationDirection.Closing,
    ]);
    expect(fullEnglishQuotationConfig.getPossibleQuoteDirections('\u2018')).toEqual([
      PairedPunctuationDirection.Opening,
    ]);
    expect(fullEnglishQuotationConfig.getPossibleQuoteDirections('\u2019')).toEqual([
      PairedPunctuationDirection.Closing,
    ]);

    const multipleDirectionsQuotationConfig: QuotationConfig = new QuotationConfig.Builder()
      .setTopLevelQuotationMarks({
        openingPunctuationMark: '\u201D',
        closingPunctuationMark: '\u201D',
      })
      .addNestedQuotationMarks({
        openingPunctuationMark: '\u2019',
        closingPunctuationMark: '\u2019',
      })
      .addNestedQuotationMarks({
        openingPunctuationMark: '\u2019',
        closingPunctuationMark: '\u2019',
      })
      .build();

    expect(multipleDirectionsQuotationConfig.getPossibleQuoteDirections('\u201D')).toEqual([
      PairedPunctuationDirection.Opening,
      PairedPunctuationDirection.Closing,
    ]);
    expect(multipleDirectionsQuotationConfig.getPossibleQuoteDirections('\u2019')).toEqual([
      PairedPunctuationDirection.Opening,
      PairedPunctuationDirection.Closing,
    ]);
    expect(multipleDirectionsQuotationConfig.getPossibleQuoteDirections('\u201C')).toEqual([]);
  });

  it('enumerates the possible depths for a quotation mark', () => {
    const basicEnglishQuotationConfig: QuotationConfig = new QuotationConfig.Builder()
      .setTopLevelQuotationMarks({
        openingPunctuationMark: '\u201C',
        closingPunctuationMark: '\u201D',
      })
      .build();

    expect(basicEnglishQuotationConfig.getPossibleQuoteDepths('\u201C')).toEqual([QuotationDepth.Primary]);
    expect(basicEnglishQuotationConfig.getPossibleQuoteDepths('\u201D')).toEqual([QuotationDepth.Primary]);

    const fullEnglishQuotationConfig: QuotationConfig = new QuotationConfig.Builder()
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
      .build();

    expect(fullEnglishQuotationConfig.getPossibleQuoteDepths('\u201C')).toEqual([
      QuotationDepth.Primary,
      QuotationDepth.Tertiary,
    ]);
    expect(fullEnglishQuotationConfig.getPossibleQuoteDepths('\u201D')).toEqual([
      QuotationDepth.Primary,
      QuotationDepth.Tertiary,
    ]);
    expect(fullEnglishQuotationConfig.getPossibleQuoteDepths('\u2018')).toEqual([QuotationDepth.Secondary]);
    expect(fullEnglishQuotationConfig.getPossibleQuoteDepths('\u2019')).toEqual([QuotationDepth.Secondary]);
  });

  it('identifies ambiguous quotation marks', () => {
    const englishQuotationConfig: QuotationConfig = new QuotationConfig.Builder()
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

    expect(englishQuotationConfig.isQuoteAmbiguous('"')).toBe(true);
    expect(englishQuotationConfig.isQuoteAmbiguous("'")).toBe(true);
    expect(englishQuotationConfig.isQuoteAmbiguous('\u201C')).toBe(false);
    expect(englishQuotationConfig.isQuoteAmbiguous('\u201D')).toBe(false);
    expect(englishQuotationConfig.isQuoteAmbiguous('\u2018')).toBe(false);
    expect(englishQuotationConfig.isQuoteAmbiguous('\u2019')).toBe(false);
  });

  it('creates a regular expression to identify quotation marks in text', () => {
    const englishQuotationConfig: QuotationConfig = new QuotationConfig.Builder()
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

    expect(englishQuotationConfig.createAllQuotesRegex()).toEqual(/[“”‘’“”"']/gu);
  });

  it('maps ambiguous quotation marks to their unambiguous versions', () => {
    const englishQuotationConfig: QuotationConfig = new QuotationConfig.Builder()
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

    expect(
      englishQuotationConfig.getUnambiguousQuotationMarkByType(
        QuotationDepth.Primary,
        PairedPunctuationDirection.Opening,
      ),
    ).toEqual('\u201C');
    expect(
      englishQuotationConfig.getUnambiguousQuotationMarkByType(
        QuotationDepth.Secondary,
        PairedPunctuationDirection.Closing,
      ),
    ).toEqual('\u2019');
    expect(
      englishQuotationConfig.getUnambiguousQuotationMarkByType(
        QuotationDepth.Tertiary,
        PairedPunctuationDirection.Closing,
      ),
    ).toEqual('\u201D');
  });

  it('returns the correct quote continuers for various depths', () => {
    const englishQuotationConfig: QuotationConfig = new QuotationConfig.Builder()
      .setTopLevelQuotationMarks({
        openingPunctuationMark: '\u201c',
        closingPunctuationMark: '\u201d',
      })
      .addNestedQuotationMarks({
        openingPunctuationMark: '\u2018',
        closingPunctuationMark: '\u2019',
      })
      .addNestedQuotationMarks({
        openingPunctuationMark: '\u201c',
        closingPunctuationMark: '\u201d',
      })
      .addNestedQuotationMarks({
        openingPunctuationMark: '\u2018',
        closingPunctuationMark: '\u2019',
      })
      .setQuoteContinuerStyle(QuoteContinuerStyle.English)
      .build();

    expect(englishQuotationConfig.getQuoteContinuerByDepth(QuotationDepth.Primary)).toEqual('\u201c');
    expect(englishQuotationConfig.getQuoteContinuerByDepth(QuotationDepth.Secondary)).toEqual('\u2018');
    expect(englishQuotationConfig.getQuoteContinuerByDepth(QuotationDepth.Tertiary)).toEqual('\u201c');
    expect(englishQuotationConfig.getQuoteContinuerByDepth(QuotationDepth.fromNumber(4))).toEqual('\u2018');

    const spanishQuoteContinuerConfig: QuotationConfig = new QuotationConfig.Builder()
      .setTopLevelQuotationMarks({
        openingPunctuationMark: '\u201c',
        closingPunctuationMark: '\u201d',
      })
      .addNestedQuotationMarks({
        openingPunctuationMark: '\u2018',
        closingPunctuationMark: '\u2019',
      })
      .addNestedQuotationMarks({
        openingPunctuationMark: '\u201c',
        closingPunctuationMark: '\u201d',
      })
      .addNestedQuotationMarks({
        openingPunctuationMark: '\u2018',
        closingPunctuationMark: '\u2019',
      })
      .setQuoteContinuerStyle(QuoteContinuerStyle.Spanish)
      .build();

    expect(spanishQuoteContinuerConfig.getQuoteContinuerByDepth(QuotationDepth.Primary)).toEqual('\u201d');
    expect(spanishQuoteContinuerConfig.getQuoteContinuerByDepth(QuotationDepth.Secondary)).toEqual('\u2019');
    expect(spanishQuoteContinuerConfig.getQuoteContinuerByDepth(QuotationDepth.Tertiary)).toEqual('\u201d');
    expect(spanishQuoteContinuerConfig.getQuoteContinuerByDepth(QuotationDepth.fromNumber(4))).toEqual('\u2019');
  });

  it('ignores quotation marks that match a pattern', () => {
    const contrivedQuotationConfig: QuotationConfig = new QuotationConfig.Builder()
      .setTopLevelQuotationMarks({
        openingPunctuationMark: '\u201C',
        closingPunctuationMark: '\u201D',
      })
      .ignoreMatchingQuotationMarks(
        new StringContextMatcher.Builder()
          .setCenterContent(/\u201D/)
          .setLeftContext(/test$/)
          .setRightContext(/.*/)
          .build(),
      )
      .build();

    expect(contrivedQuotationConfig.isQuotationMarkPotentiallyIgnoreable('\u201C')).toBe(false);
    expect(contrivedQuotationConfig.isQuotationMarkPotentiallyIgnoreable('\u201D')).toBe(true);
    expect(contrivedQuotationConfig.shouldIgnoreQuotationMark('\u201D', 'test', 'other')).toBe(true);
    expect(contrivedQuotationConfig.shouldIgnoreQuotationMark('\u201C', 'test', 'other')).toBe(false);
    expect(contrivedQuotationConfig.shouldIgnoreQuotationMark('\u201D', 'testa', 'other')).toBe(false);

    const possesiveAndContractionQuotationConfig: QuotationConfig = new QuotationConfig.Builder()
      .setTopLevelQuotationMarks({
        openingPunctuationMark: '\u2018',
        closingPunctuationMark: '\u2019',
      })
      .mapAmbiguousQuotationMark('"', '\u201C')
      .mapAmbiguousQuotationMark('"', '\u201D')
      .mapAmbiguousQuotationMark("'", '\u2018')
      .mapAmbiguousQuotationMark("'", '\u2019')
      .ignoreMatchingQuotationMarks(
        new StringContextMatcher.Builder()
          .setCenterContent(/^['\u2019]$/)
          .setLeftContext(/\w$/)
          .setRightContext(/^\w/)
          .build(),
      )
      .build();

    expect(possesiveAndContractionQuotationConfig.isQuotationMarkPotentiallyIgnoreable("'")).toBe(true);
    expect(possesiveAndContractionQuotationConfig.isQuotationMarkPotentiallyIgnoreable('\u2019')).toBe(true);
    expect(possesiveAndContractionQuotationConfig.isQuotationMarkPotentiallyIgnoreable('\u2018')).toBe(false);
    expect(possesiveAndContractionQuotationConfig.isQuotationMarkPotentiallyIgnoreable('"')).toBe(false);
    expect(possesiveAndContractionQuotationConfig.shouldIgnoreQuotationMark("'", 'I', 've')).toBe(true);
    expect(possesiveAndContractionQuotationConfig.shouldIgnoreQuotationMark('\u2019', 'I', 've')).toBe(true);
    expect(possesiveAndContractionQuotationConfig.shouldIgnoreQuotationMark('\u2018', 'I', 've')).toBe(false);
    expect(possesiveAndContractionQuotationConfig.shouldIgnoreQuotationMark('\u2019', 'I ', 've')).toBe(false);
    expect(possesiveAndContractionQuotationConfig.shouldIgnoreQuotationMark('\u2019', 'I', ' ve')).toBe(false);
    expect(possesiveAndContractionQuotationConfig.shouldIgnoreQuotationMark("'", 'Abram', 's')).toBe(true);
    expect(possesiveAndContractionQuotationConfig.shouldIgnoreQuotationMark("'", 'Abram', 's ser')).toBe(true);
  });

  it('identifies quotation marks that can be auto-corrected', () => {
    const englishQuotationConfig: QuotationConfig = new QuotationConfig.Builder()
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
        new StringContextMatcher.Builder().setCenterContent(/'/).setLeftContext(/\w$/).setRightContext(/.*/).build(),
      )
      .build();

    expect(
      englishQuotationConfig.isQuoteAutocorrectable(new QuotationMarkMatch(new TextDocumentCheckable('\u201C'), 0, 1)),
    ).toBe(false);
    expect(
      englishQuotationConfig.isQuoteAutocorrectable(new QuotationMarkMatch(new TextDocumentCheckable('\u201D'), 0, 1)),
    ).toBe(false);
    expect(
      englishQuotationConfig.isQuoteAutocorrectable(new QuotationMarkMatch(new TextDocumentCheckable('\u2018'), 0, 1)),
    ).toBe(false);
    expect(
      englishQuotationConfig.isQuoteAutocorrectable(new QuotationMarkMatch(new TextDocumentCheckable('\u2019'), 0, 1)),
    ).toBe(false);

    expect(
      englishQuotationConfig.isQuoteAutocorrectable(new QuotationMarkMatch(new TextDocumentCheckable('"'), 0, 1)),
    ).toBe(true);
    expect(
      englishQuotationConfig.isQuoteAutocorrectable(new QuotationMarkMatch(new TextDocumentCheckable("'"), 0, 1)),
    ).toBe(true);

    expect(
      englishQuotationConfig.isQuoteAutocorrectable(
        new QuotationMarkMatch(new TextDocumentCheckable('test\u201C'), 4, 1),
      ),
    ).toBe(false);
    expect(
      englishQuotationConfig.isQuoteAutocorrectable(
        new QuotationMarkMatch(new TextDocumentCheckable('test\u201D'), 4, 1),
      ),
    ).toBe(false);
    expect(
      englishQuotationConfig.isQuoteAutocorrectable(
        new QuotationMarkMatch(new TextDocumentCheckable('test\u2018'), 4, 1),
      ),
    ).toBe(false);
    expect(
      englishQuotationConfig.isQuoteAutocorrectable(
        new QuotationMarkMatch(new TextDocumentCheckable('test\u2019'), 4, 1),
      ),
    ).toBe(false);

    expect(
      englishQuotationConfig.isQuoteAutocorrectable(new QuotationMarkMatch(new TextDocumentCheckable('test"'), 4, 1)),
    ).toBe(true);
    expect(
      englishQuotationConfig.isQuoteAutocorrectable(new QuotationMarkMatch(new TextDocumentCheckable("test'"), 4, 1)),
    ).toBe(false);

    expect(
      englishQuotationConfig.isQuoteAutocorrectable(
        new QuotationMarkMatch(new TextDocumentCheckable('test \u201C'), 5, 1),
      ),
    ).toBe(false);
    expect(
      englishQuotationConfig.isQuoteAutocorrectable(
        new QuotationMarkMatch(new TextDocumentCheckable('test \u201D'), 5, 1),
      ),
    ).toBe(false);
    expect(
      englishQuotationConfig.isQuoteAutocorrectable(
        new QuotationMarkMatch(new TextDocumentCheckable('test \u2018'), 5, 1),
      ),
    ).toBe(false);
    expect(
      englishQuotationConfig.isQuoteAutocorrectable(
        new QuotationMarkMatch(new TextDocumentCheckable('test \u2019'), 5, 1),
      ),
    ).toBe(false);

    expect(
      englishQuotationConfig.isQuoteAutocorrectable(new QuotationMarkMatch(new TextDocumentCheckable('test "'), 5, 1)),
    ).toBe(true);
    expect(
      englishQuotationConfig.isQuoteAutocorrectable(new QuotationMarkMatch(new TextDocumentCheckable("test '"), 5, 1)),
    ).toBe(true);
  });

  describe('identifies quotation marks that could be quote continuers', () => {
    const checkable1: Checkable = new TextDocumentCheckable('First line\n\u201csecond line \n\u201cthird line');
    const checkable2: Checkable = new TextDocumentCheckable(
      'First line\n\u201csecond \u2018line \n\u201c\u2018third line',
    );
    const checkable3: Checkable = new TextDocumentCheckable(
      'First line\n\u201csecond \u2018line \n\u201d\u2019third line\u2019',
    );

    it('does not identify any quote continuers if the QuoteContinuerStyle is "None"', () => {
      const noContinuersConfig: QuotationConfig = new QuotationConfig.Builder()
        .setTopLevelQuotationMarks({
          openingPunctuationMark: '\u201c',
          closingPunctuationMark: '\u201d',
        })
        .addNestedQuotationMarks({
          openingPunctuationMark: '\u2018',
          closingPunctuationMark: '\u2019',
        })
        .addNestedQuotationMarks({
          openingPunctuationMark: '\u201c',
          closingPunctuationMark: '\u201d',
        })
        .addNestedQuotationMarks({
          openingPunctuationMark: '\u2018',
          closingPunctuationMark: '\u2019',
        })
        .setQuoteContinuerStyle(QuoteContinuerStyle.None)
        .build();

      expect(noContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable1, 11, 1))).toBe(false);
      expect(noContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable1, 25, 1))).toBe(false);

      expect(noContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable2, 11, 1))).toBe(false);
      expect(noContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable2, 19, 1))).toBe(false);
      expect(noContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable2, 26, 1))).toBe(false);
      expect(noContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable2, 27, 1))).toBe(false);

      expect(noContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable3, 11, 1))).toBe(false);
      expect(noContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable3, 19, 1))).toBe(false);
      expect(noContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable3, 26, 1))).toBe(false);
      expect(noContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable3, 27, 1))).toBe(false);
      expect(noContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable3, 37, 1))).toBe(false);
    });

    it('correctly identifies possible English-style quote continuers', () => {
      const englishContinuersConfig: QuotationConfig = new QuotationConfig.Builder()
        .setTopLevelQuotationMarks({
          openingPunctuationMark: '\u201c',
          closingPunctuationMark: '\u201d',
        })
        .addNestedQuotationMarks({
          openingPunctuationMark: '\u2018',
          closingPunctuationMark: '\u2019',
        })
        .addNestedQuotationMarks({
          openingPunctuationMark: '\u201c',
          closingPunctuationMark: '\u201d',
        })
        .addNestedQuotationMarks({
          openingPunctuationMark: '\u2018',
          closingPunctuationMark: '\u2019',
        })
        .setQuoteContinuerStyle(QuoteContinuerStyle.English)
        .build();

      expect(englishContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable1, 11, 1))).toBe(
        true,
      );
      expect(englishContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable1, 25, 1))).toBe(
        true,
      );

      expect(englishContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable2, 11, 1))).toBe(
        true,
      );
      expect(englishContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable2, 19, 1))).toBe(
        false,
      );
      expect(englishContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable2, 26, 1))).toBe(
        true,
      );
      expect(englishContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable2, 27, 1))).toBe(
        true,
      );

      expect(englishContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable3, 11, 1))).toBe(
        true,
      );
      expect(englishContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable3, 19, 1))).toBe(
        false,
      );
      expect(englishContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable3, 26, 1))).toBe(
        false,
      );
      expect(englishContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable3, 27, 1))).toBe(
        false,
      );
      expect(englishContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable3, 37, 1))).toBe(
        false,
      );
    });

    it('correctly identifies possible Spanish-style quote continuers', () => {
      const spanishContinuersConfig: QuotationConfig = new QuotationConfig.Builder()
        .setTopLevelQuotationMarks({
          openingPunctuationMark: '\u201c',
          closingPunctuationMark: '\u201d',
        })
        .addNestedQuotationMarks({
          openingPunctuationMark: '\u2018',
          closingPunctuationMark: '\u2019',
        })
        .addNestedQuotationMarks({
          openingPunctuationMark: '\u201c',
          closingPunctuationMark: '\u201d',
        })
        .addNestedQuotationMarks({
          openingPunctuationMark: '\u2018',
          closingPunctuationMark: '\u2019',
        })
        .setQuoteContinuerStyle(QuoteContinuerStyle.Spanish)
        .build();

      expect(spanishContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable1, 11, 1))).toBe(
        false,
      );
      expect(spanishContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable1, 25, 1))).toBe(
        false,
      );

      expect(spanishContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable2, 11, 1))).toBe(
        false,
      );
      expect(spanishContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable2, 19, 1))).toBe(
        false,
      );
      expect(spanishContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable2, 26, 1))).toBe(
        false,
      );
      expect(spanishContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable2, 27, 1))).toBe(
        false,
      );

      expect(spanishContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable3, 11, 1))).toBe(
        false,
      );
      expect(spanishContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable3, 19, 1))).toBe(
        false,
      );
      expect(spanishContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable3, 26, 1))).toBe(
        true,
      );
      expect(spanishContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable3, 27, 1))).toBe(
        true,
      );
      expect(spanishContinuersConfig.couldQuotationMarkBeContinuer(new QuotationMarkMatch(checkable3, 37, 1))).toBe(
        false,
      );
    });
  });
});
