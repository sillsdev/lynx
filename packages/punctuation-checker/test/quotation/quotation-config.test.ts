import { describe, expect, it } from 'vitest';

import { QuotationConfig } from '../../src/quotation/quotation-config';
import { QuotationDepth, QuotationDirection } from '../../src/quotation/quotation-utils';
import { StringContextMatcher } from '../../src/utils';

describe('QuotationConfig tests', () => {
  it('enumerates the possible directions for a quotation mark', () => {
    const basicEnglishQuotationConfig: QuotationConfig = new QuotationConfig.Builder()
      .setTopLevelQuotationMarks({
        openingPunctuationMark: '\u201C',
        closingPunctuationMark: '\u201D',
      })
      .build();

    expect(basicEnglishQuotationConfig.getPossibleQuoteDirections('\u201C')).toEqual([QuotationDirection.Opening]);
    expect(basicEnglishQuotationConfig.getPossibleQuoteDirections('\u201D')).toEqual([QuotationDirection.Closing]);

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

    expect(fullEnglishQuotationConfig.getPossibleQuoteDirections('\u201C')).toEqual([QuotationDirection.Opening]);
    expect(fullEnglishQuotationConfig.getPossibleQuoteDirections('\u201D')).toEqual([QuotationDirection.Closing]);
    expect(fullEnglishQuotationConfig.getPossibleQuoteDirections('\u2018')).toEqual([QuotationDirection.Opening]);
    expect(fullEnglishQuotationConfig.getPossibleQuoteDirections('\u2019')).toEqual([QuotationDirection.Closing]);

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
      QuotationDirection.Opening,
      QuotationDirection.Closing,
    ]);
    expect(multipleDirectionsQuotationConfig.getPossibleQuoteDirections('\u2019')).toEqual([
      QuotationDirection.Opening,
      QuotationDirection.Closing,
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
      .build();

    expect(englishQuotationConfig.isQuoteAutocorrectable('"')).toBe(true);
    expect(englishQuotationConfig.isQuoteAutocorrectable("'")).toBe(true);
    expect(englishQuotationConfig.isQuoteAutocorrectable('\u201C')).toBe(false);
    expect(englishQuotationConfig.isQuoteAutocorrectable('\u201D')).toBe(false);
    expect(englishQuotationConfig.isQuoteAutocorrectable('\u2018')).toBe(false);
    expect(englishQuotationConfig.isQuoteAutocorrectable('\u2019')).toBe(false);
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
      englishQuotationConfig.getUnambiguousQuotationMarkByType(QuotationDepth.Primary, QuotationDirection.Opening),
    ).toEqual('\u201C');
    expect(
      englishQuotationConfig.getUnambiguousQuotationMarkByType(QuotationDepth.Secondary, QuotationDirection.Closing),
    ).toEqual('\u2019');
    expect(
      englishQuotationConfig.getUnambiguousQuotationMarkByType(QuotationDepth.Tertiary, QuotationDirection.Closing),
    ).toEqual('\u201D');
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
});