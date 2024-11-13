import { describe, expect, it } from 'vitest';

import { QuotationConfig } from '../../src/quotation/quotation-config';
import {
  QuotationDepth,
  QuotationDirection,
  QuotationIterator,
  QuotationRootLevel,
  UnresolvedQuoteMetadata,
} from '../../src/quotation/quotation-utils';
import { StringContextMatcher } from '../../src/utils';

describe('QuotationIterator tests', () => {
  describe('Top-level English quotation marks', () => {
    const quotationConfig = new QuotationConfig.Builder()
      .setTopLevelQuotationMarks({
        openingPunctuationMark: '\u201C',
        closingPunctuationMark: '\u201D',
      })
      .build();

    describe('Identification of unpaired quotation marks', () => {
      it('does not identify quotes in quote-less text', () => {
        const emptyStringIterator: QuotationIterator = new QuotationIterator(quotationConfig, '');
        expect(emptyStringIterator.hasNext()).toBe(false);

        const noQuotationsIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          'There are no quotes in this text.',
        );
        expect(noQuotationsIterator.hasNext()).toBe(false);
      });

      it('identifies unpaired quotation marks in otherwise empty strings', () => {
        const openingQuotationIterator: QuotationIterator = new QuotationIterator(quotationConfig, '\u201C');
        expect(openingQuotationIterator.hasNext()).toBe(true);
        expect(openingQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(0)
            .setEndIndex(1)
            .setText('\u201C')
            .build(),
        );
        expect(openingQuotationIterator.hasNext()).toBe(false);
        expect(() => {
          openingQuotationIterator.next();
        }).toThrowError(/QuoteIterator's next\(\) function called after hasNext\(\) returned false/);

        const closingQuotationIterator: QuotationIterator = new QuotationIterator(quotationConfig, '\u201D');
        expect(closingQuotationIterator.hasNext()).toBe(true);
        expect(closingQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(0)
            .setEndIndex(1)
            .setText('\u201D')
            .build(),
        );
        expect(closingQuotationIterator.hasNext()).toBe(false);
      });

      it('identifies unpaired quotation marks in non-empty strings', () => {
        const previousContextOpeningQuotationIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          'Extra text, \u201C',
        );
        expect(previousContextOpeningQuotationIterator.hasNext()).toBe(true);
        expect(previousContextOpeningQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(12)
            .setEndIndex(13)
            .setText('\u201C')
            .build(),
        );
        expect(previousContextOpeningQuotationIterator.hasNext()).toBe(false);

        const trailingContextOpeningQuotationIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          '\u201CWith extra text at the end',
        );
        expect(trailingContextOpeningQuotationIterator.hasNext()).toBe(true);
        expect(trailingContextOpeningQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(0)
            .setEndIndex(1)
            .setText('\u201C')
            .build(),
        );
        expect(trailingContextOpeningQuotationIterator.hasNext()).toBe(false);

        const twoSidedContextOpeningQuotationIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          'Text at the start, \u201CWith extra text at the end',
        );
        expect(twoSidedContextOpeningQuotationIterator.hasNext()).toBe(true);
        expect(twoSidedContextOpeningQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(19)
            .setEndIndex(20)
            .setText('\u201C')
            .build(),
        );
        expect(twoSidedContextOpeningQuotationIterator.hasNext()).toBe(false);

        const previousContextClosingQuotationIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          ' starting text\u201D',
        );
        expect(previousContextClosingQuotationIterator.hasNext()).toBe(true);
        expect(previousContextClosingQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(14)
            .setEndIndex(15)
            .setText('\u201D')
            .build(),
        );
        expect(previousContextClosingQuotationIterator.hasNext()).toBe(false);

        const trailingContextClosingQuotationIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          '\u201Dwith extra at the end.',
        );
        expect(trailingContextClosingQuotationIterator.hasNext()).toBe(true);
        expect(trailingContextClosingQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(0)
            .setEndIndex(1)
            .setText('\u201D')
            .build(),
        );
        expect(trailingContextClosingQuotationIterator.hasNext()).toBe(false);

        const twoSidedContextClosingQuotationIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          'Prior text \u201Dwith extra at the end.',
        );
        expect(twoSidedContextClosingQuotationIterator.hasNext()).toBe(true);
        expect(twoSidedContextClosingQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(11)
            .setEndIndex(12)
            .setText('\u201D')
            .build(),
        );
        expect(twoSidedContextClosingQuotationIterator.hasNext()).toBe(false);
      });

      it('does not depend on correct formatting of whitespace', () => {
        const noWhitespaceOpeningQuotationIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          'Text immediately prior\u201Cwith text immediately afterward',
        );
        expect(noWhitespaceOpeningQuotationIterator.hasNext()).toBe(true);
        expect(noWhitespaceOpeningQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(22)
            .setEndIndex(23)
            .setText('\u201C')
            .build(),
        );
        expect(noWhitespaceOpeningQuotationIterator.hasNext()).toBe(false);

        const reversedWhitespaceOpeningQuotationIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          'No previous space\u201C but a space afterward',
        );
        expect(reversedWhitespaceOpeningQuotationIterator.hasNext()).toBe(true);
        expect(reversedWhitespaceOpeningQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(17)
            .setEndIndex(18)
            .setText('\u201C')
            .build(),
        );
        expect(reversedWhitespaceOpeningQuotationIterator.hasNext()).toBe(false);

        const noWhitespaceClosingQuotationIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          'Text immediately prior\u201Dwith text immediately afterward',
        );
        expect(noWhitespaceClosingQuotationIterator.hasNext()).toBe(true);
        expect(noWhitespaceClosingQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(22)
            .setEndIndex(23)
            .setText('\u201D')
            .build(),
        );
        expect(noWhitespaceClosingQuotationIterator.hasNext()).toBe(false);

        const reversedWhitespaceClosingQuotationIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          'A previous space \u201Dbut no space afterward',
        );
        expect(reversedWhitespaceClosingQuotationIterator.hasNext()).toBe(true);
        expect(reversedWhitespaceClosingQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(17)
            .setEndIndex(18)
            .setText('\u201D')
            .build(),
        );
        expect(reversedWhitespaceClosingQuotationIterator.hasNext()).toBe(false);
      });
    });

    describe('Identification of multiple quotation marks', () => {
      it('identifies a pair of quotation marks in otherwise empty strings', () => {
        const quotationPairIterator: QuotationIterator = new QuotationIterator(quotationConfig, '\u201C\u201D');

        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(0)
            .setEndIndex(1)
            .setText('\u201C')
            .build(),
        );
        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(1)
            .setEndIndex(2)
            .setText('\u201D')
            .build(),
        );
        expect(quotationPairIterator.hasNext()).toBe(false);
      });

      it('identifies a pair of quotation marks in non-empty strings', () => {
        const quotationPairIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          '\u201CSample text.\u201D',
        );
        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(0)
            .setEndIndex(1)
            .setText('\u201C')
            .build(),
        );
        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(13)
            .setEndIndex(14)
            .setText('\u201D')
            .build(),
        );
        expect(quotationPairIterator.hasNext()).toBe(false);

        const previousContextQuotationPairIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          'Context on the left, \u201CSample text.\u201D',
        );
        expect(previousContextQuotationPairIterator.hasNext()).toBe(true);
        expect(previousContextQuotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(21)
            .setEndIndex(22)
            .setText('\u201C')
            .build(),
        );
        expect(previousContextQuotationPairIterator.hasNext()).toBe(true);
        expect(previousContextQuotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(34)
            .setEndIndex(35)
            .setText('\u201D')
            .build(),
        );
        expect(previousContextQuotationPairIterator.hasNext()).toBe(false);

        const trailingContextQuotationPairIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          '\u201CSample text.\u201D with context on the right.',
        );
        expect(trailingContextQuotationPairIterator.hasNext()).toBe(true);
        expect(trailingContextQuotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(0)
            .setEndIndex(1)
            .setText('\u201C')
            .build(),
        );
        expect(trailingContextQuotationPairIterator.hasNext()).toBe(true);
        expect(trailingContextQuotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(13)
            .setEndIndex(14)
            .setText('\u201D')
            .build(),
        );
        expect(trailingContextQuotationPairIterator.hasNext()).toBe(false);

        const twoSidedContextQuotationPairIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          'Context on the left, \u201CSample text.\u201D with context on the right',
        );
        expect(twoSidedContextQuotationPairIterator.hasNext()).toBe(true);
        expect(twoSidedContextQuotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(21)
            .setEndIndex(22)
            .setText('\u201C')
            .build(),
        );
        expect(twoSidedContextQuotationPairIterator.hasNext()).toBe(true);
        expect(twoSidedContextQuotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(34)
            .setEndIndex(35)
            .setText('\u201D')
            .build(),
        );
        expect(twoSidedContextQuotationPairIterator.hasNext()).toBe(false);
      });

      it('identifies multiple pairs of quotation marks', () => {
        const quotationPairIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          '\u201CSample text.\u201D and, \u201Cmore sample text\u201D',
        );
        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(0)
            .setEndIndex(1)
            .setText('\u201C')
            .build(),
        );
        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(13)
            .setEndIndex(14)
            .setText('\u201D')
            .build(),
        );
        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(20)
            .setEndIndex(21)
            .setText('\u201C')
            .build(),
        );
        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(37)
            .setEndIndex(38)
            .setText('\u201D')
            .build(),
        );
        expect(quotationPairIterator.hasNext()).toBe(false);
      });
    });

    describe('Identification of ambiguous quotation marks', () => {
      const ambiguousQuotationConfig = new QuotationConfig.Builder()
        .setTopLevelQuotationMarks({
          openingPunctuationMark: '\u201C',
          closingPunctuationMark: '\u201D',
        })
        .mapAmbiguousQuotationMark('"', '\u201C')
        .mapAmbiguousQuotationMark('"', '\u201D')
        .build();

      it('identifies ambiguous quotes in text with no unambiguous quotes', () => {
        const singleQuotationIterator: QuotationIterator = new QuotationIterator(
          ambiguousQuotationConfig,
          'Sample" text.',
        );
        expect(singleQuotationIterator.hasNext()).toBe(true);
        expect(singleQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Opening)
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(6)
            .setEndIndex(7)
            .setText('"')
            .markAsAutocorrectable()
            .build(),
        );
        expect(singleQuotationIterator.hasNext()).toBe(false);

        const quotationPairIterator: QuotationIterator = new QuotationIterator(
          ambiguousQuotationConfig,
          '"Sample text."',
        );
        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Opening)
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(0)
            .setEndIndex(1)
            .setText('"')
            .markAsAutocorrectable()
            .build(),
        );
        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Opening)
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(13)
            .setEndIndex(14)
            .setText('"')
            .markAsAutocorrectable()
            .build(),
        );
        expect(quotationPairIterator.hasNext()).toBe(false);
      });

      it('identifies ambiguous quotes in text containing unambiugous quotes', () => {
        const mixedQuotationIterator: QuotationIterator = new QuotationIterator(
          ambiguousQuotationConfig,
          'This text \u201Ccontains "straight" and curly quotes.\u201D',
        );
        expect(mixedQuotationIterator.hasNext()).toBe(true);
        expect(mixedQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(10)
            .setEndIndex(11)
            .setText('\u201C')
            .build(),
        );
        expect(mixedQuotationIterator.hasNext()).toBe(true);
        expect(mixedQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Opening)
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(20)
            .setEndIndex(21)
            .setText('"')
            .markAsAutocorrectable()
            .build(),
        );
        expect(mixedQuotationIterator.hasNext()).toBe(true);
        expect(mixedQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Opening)
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(29)
            .setEndIndex(30)
            .setText('"')
            .markAsAutocorrectable()
            .build(),
        );
        expect(mixedQuotationIterator.hasNext()).toBe(true);
        expect(mixedQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(48)
            .setEndIndex(49)
            .setText('\u201D')
            .build(),
        );
        expect(mixedQuotationIterator.hasNext()).toBe(false);
      });
    });

    describe('Identification of ill-formed quotation marks', () => {
      it('identifies quotation marks that are improperly nested', () => {
        const improperlyNestedOpeningQuotationIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          '\u201CThis contains an \u201C improperly nested quotation mark.\u201D',
        );
        expect(improperlyNestedOpeningQuotationIterator.hasNext()).toBe(true);
        expect(improperlyNestedOpeningQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(0)
            .setEndIndex(1)
            .setText('\u201C')
            .build(),
        );
        expect(improperlyNestedOpeningQuotationIterator.hasNext()).toBe(true);
        expect(improperlyNestedOpeningQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(18)
            .setEndIndex(19)
            .setText('\u201C')
            .build(),
        );
        expect(improperlyNestedOpeningQuotationIterator.hasNext()).toBe(true);
        expect(improperlyNestedOpeningQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(53)
            .setEndIndex(54)
            .setText('\u201D')
            .build(),
        );
        expect(improperlyNestedOpeningQuotationIterator.hasNext()).toBe(false);

        const improperlyNestedClosingQuotationIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          '\u201CThis contains an \u201D improperly nested quotation mark.\u201D',
        );
        expect(improperlyNestedClosingQuotationIterator.hasNext()).toBe(true);
        expect(improperlyNestedClosingQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(0)
            .setEndIndex(1)
            .setText('\u201C')
            .build(),
        );
        expect(improperlyNestedClosingQuotationIterator.hasNext()).toBe(true);
        expect(improperlyNestedClosingQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(18)
            .setEndIndex(19)
            .setText('\u201D')
            .build(),
        );
        expect(improperlyNestedClosingQuotationIterator.hasNext()).toBe(true);
        expect(improperlyNestedClosingQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(53)
            .setEndIndex(54)
            .setText('\u201D')
            .build(),
        );
        expect(improperlyNestedClosingQuotationIterator.hasNext()).toBe(false);
      });

      it('identifies unpaired quotation marks', () => {
        const unpairedOpeningQuotationIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          '\u201CThe second quotation mark\u201D is \u201C never closed.',
        );
        expect(unpairedOpeningQuotationIterator.hasNext()).toBe(true);
        expect(unpairedOpeningQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(0)
            .setEndIndex(1)
            .setText('\u201C')
            .build(),
        );
        expect(unpairedOpeningQuotationIterator.hasNext()).toBe(true);
        expect(unpairedOpeningQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(26)
            .setEndIndex(27)
            .setText('\u201D')
            .build(),
        );
        expect(unpairedOpeningQuotationIterator.hasNext()).toBe(true);
        expect(unpairedOpeningQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(31)
            .setEndIndex(32)
            .setText('\u201C')
            .build(),
        );
        expect(unpairedOpeningQuotationIterator.hasNext()).toBe(false);

        const unpairedClosingQuotationIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          'The first \u201D quotation mark \u201Cis unpaired.\u201D',
        );
        expect(unpairedClosingQuotationIterator.hasNext()).toBe(true);
        expect(unpairedClosingQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(10)
            .setEndIndex(11)
            .setText('\u201D')
            .build(),
        );
        expect(unpairedClosingQuotationIterator.hasNext()).toBe(true);
        expect(unpairedClosingQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(27)
            .setEndIndex(28)
            .setText('\u201C')
            .build(),
        );
        expect(unpairedClosingQuotationIterator.hasNext()).toBe(true);
        expect(unpairedClosingQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(40)
            .setEndIndex(41)
            .setText('\u201D')
            .build(),
        );
        expect(unpairedClosingQuotationIterator.hasNext()).toBe(false);
      });
    });

    describe('Adherence to the QuotationConfig', () => {
      it('does not identify single quotes', () => {
        const singleQuotationIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          '\u2018single quoted text\u2019',
        );
        expect(singleQuotationIterator.hasNext()).toBe(false);

        const singleAndDoubleQuotationIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          '\u201Cdouble and \u2018single quoted text\u201D',
        );
        expect(singleAndDoubleQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(0)
            .setEndIndex(1)
            .setText('\u201C')
            .build(),
        );
        expect(singleAndDoubleQuotationIterator.hasNext()).toBe(true);
        expect(singleAndDoubleQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(31)
            .setEndIndex(32)
            .setText('\u201D')
            .build(),
        );
        expect(singleAndDoubleQuotationIterator.hasNext()).toBe(false);
      });

      it('does not identify straight quotes', () => {
        const straightDoubleQuoteIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          '"straight double quotes"',
        );
        expect(straightDoubleQuoteIterator.hasNext()).toBe(false);

        const straightSingleQuoteIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          "'straight double quotes'",
        );
        expect(straightSingleQuoteIterator.hasNext()).toBe(false);

        const curlyAndStraightDoubleQuoteIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          '\u201Ccurly and straight quotes used here"',
        );
        expect(curlyAndStraightDoubleQuoteIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(0)
            .setEndIndex(1)
            .setText('\u201C')
            .build(),
        );
        expect(curlyAndStraightDoubleQuoteIterator.hasNext()).toBe(false);

        const curlyDoubleAndStraightSingleQuoteIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          "\u201Ccurly double and 'straight' quotes used here",
        );
        expect(curlyDoubleAndStraightSingleQuoteIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepth(QuotationDepth.Primary)
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(0)
            .setEndIndex(1)
            .setText('\u201C')
            .build(),
        );
        expect(curlyDoubleAndStraightSingleQuoteIterator.hasNext()).toBe(false);
      });

      it('does not identify alternative top-level quotes', () => {
        const guillemetsIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          '\u00ABFrench-style guillemets\u00BB',
        );
        expect(guillemetsIterator.hasNext()).toBe(false);

        const germanQuotesIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          '\u201EGerman-style quotes\u201F',
        );
        expect(germanQuotesIterator.hasNext()).toBe(false);
      });
    });
  });

  describe('Multi-level English quotation marks', () => {
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
      .addNestedQuotationMarks({
        openingPunctuationMark: '\u2018',
        closingPunctuationMark: '\u2019',
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
          .setRightContext(/^[ \n,.:;]/)
          .build(),
      )
      .setNestingWarningDepth(QuotationDepth.fromNumber(4))
      .build();

    it('skips over apostrophes', () => {
      const basicPossessiveIterator: QuotationIterator = new QuotationIterator(quotationConfig, "Abraham's servant");
      expect(basicPossessiveIterator.hasNext()).toBe(false);

      const basicPossessiveIterator2: QuotationIterator = new QuotationIterator(
        quotationConfig,
        'Abraham\u2019s servant',
      );
      expect(basicPossessiveIterator2.hasNext()).toBe(false);

      const basicContractionIterator: QuotationIterator = new QuotationIterator(quotationConfig, "they're");
      expect(basicContractionIterator.hasNext()).toBe(false);

      const basicContractionIterator2: QuotationIterator = new QuotationIterator(quotationConfig, 'they\u2019re');
      expect(basicContractionIterator2.hasNext()).toBe(false);

      const sPossessiveIterator: QuotationIterator = new QuotationIterator(quotationConfig, "your sons' wives");
      expect(sPossessiveIterator.hasNext()).toBe(false);

      const sPossessiveIterator2: QuotationIterator = new QuotationIterator(quotationConfig, 'your sons\u2019 wives');
      expect(sPossessiveIterator2.hasNext()).toBe(false);

      const quotedApostropheIterator: QuotationIterator = new QuotationIterator(
        quotationConfig,
        '\u201CThis is one of the Hebrews\u2019 children.\u201D',
      );
      expect(quotedApostropheIterator.hasNext()).toBe(true);
      expect(quotedApostropheIterator.next()).toEqual(
        new UnresolvedQuoteMetadata.Builder()
          .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
          .addDirection(QuotationDirection.Opening)
          .setStartIndex(0)
          .setEndIndex(1)
          .setText('\u201C')
          .build(),
      );
      expect(quotedApostropheIterator.hasNext()).toBe(true);
      expect(quotedApostropheIterator.next()).toEqual(
        new UnresolvedQuoteMetadata.Builder()
          .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
          .addDirection(QuotationDirection.Closing)
          .setStartIndex(38)
          .setEndIndex(39)
          .setText('\u201D')
          .build(),
      );
      expect(quotedApostropheIterator.hasNext()).toBe(false);
    });

    describe('Identification of multiple quotation marks', () => {
      it('identifies multiple levels of quotes in otherwise empty text', () => {
        const quotationPairIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          '\u201C\u2018\u2019\u201D',
        );

        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(0)
            .setEndIndex(1)
            .setText('\u201C')
            .build(),
        );
        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(1)
            .setEndIndex(2)
            .setText('\u2018')
            .build(),
        );
        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(2)
            .setEndIndex(3)
            .setText('\u2019')
            .build(),
        );
        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(3)
            .setEndIndex(4)
            .setText('\u201D')
            .build(),
        );
        expect(quotationPairIterator.hasNext()).toBe(false);

        const threeLevelQuotationPairIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          '\u201C\u2018\u201C\u201D\u2019\u201D',
        );

        expect(threeLevelQuotationPairIterator.hasNext()).toBe(true);
        expect(threeLevelQuotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(0)
            .setEndIndex(1)
            .setText('\u201C')
            .build(),
        );
        expect(threeLevelQuotationPairIterator.hasNext()).toBe(true);
        expect(threeLevelQuotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(1)
            .setEndIndex(2)
            .setText('\u2018')
            .build(),
        );
        expect(threeLevelQuotationPairIterator.hasNext()).toBe(true);
        expect(threeLevelQuotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(2)
            .setEndIndex(3)
            .setText('\u201C')
            .build(),
        );
        expect(threeLevelQuotationPairIterator.hasNext()).toBe(true);
        expect(threeLevelQuotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(3)
            .setEndIndex(4)
            .setText('\u201D')
            .build(),
        );
        expect(threeLevelQuotationPairIterator.hasNext()).toBe(true);
        expect(threeLevelQuotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(4)
            .setEndIndex(5)
            .setText('\u2019')
            .build(),
        );
        expect(threeLevelQuotationPairIterator.hasNext()).toBe(true);
        expect(threeLevelQuotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(5)
            .setEndIndex(6)
            .setText('\u201D')
            .build(),
        );
        expect(threeLevelQuotationPairIterator.hasNext()).toBe(false);
      });

      it('identifies multiple levels of quotes in non-empty text', () => {
        const quotationPairIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          '\u201CThis text \u2018contains multiple\u2019 quote levels\u201D',
        );

        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(0)
            .setEndIndex(1)
            .setText('\u201C')
            .build(),
        );
        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(11)
            .setEndIndex(12)
            .setText('\u2018')
            .build(),
        );
        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(29)
            .setEndIndex(30)
            .setText('\u2019')
            .build(),
        );
        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(43)
            .setEndIndex(44)
            .setText('\u201D')
            .build(),
        );
        expect(quotationPairIterator.hasNext()).toBe(false);

        const threeLevelQuotationPairIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          '\u201CThis text \u2018has \u201Cthree levels\u201D of quotations\u2019\u201D',
        );

        expect(threeLevelQuotationPairIterator.hasNext()).toBe(true);
        expect(threeLevelQuotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(0)
            .setEndIndex(1)
            .setText('\u201C')
            .build(),
        );
        expect(threeLevelQuotationPairIterator.hasNext()).toBe(true);
        expect(threeLevelQuotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(11)
            .setEndIndex(12)
            .setText('\u2018')
            .build(),
        );
        expect(threeLevelQuotationPairIterator.hasNext()).toBe(true);
        expect(threeLevelQuotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(16)
            .setEndIndex(17)
            .setText('\u201C')
            .build(),
        );
        expect(threeLevelQuotationPairIterator.hasNext()).toBe(true);
        expect(threeLevelQuotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(29)
            .setEndIndex(30)
            .setText('\u201D')
            .build(),
        );
        expect(threeLevelQuotationPairIterator.hasNext()).toBe(true);
        expect(threeLevelQuotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(44)
            .setEndIndex(45)
            .setText('\u2019')
            .build(),
        );
        expect(threeLevelQuotationPairIterator.hasNext()).toBe(true);
        expect(threeLevelQuotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(45)
            .setEndIndex(46)
            .setText('\u201D')
            .build(),
        );
        expect(threeLevelQuotationPairIterator.hasNext()).toBe(false);
      });
    });

    describe('Identification of ambiguous quotation marks', () => {
      it('identifies ambiguous quotes in text with no unambiguous quotes', () => {
        const quotationPairIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          'This text "has \'multiple levels of "ambiguous" quotations\'"',
        );

        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirections([QuotationDirection.Opening, QuotationDirection.Closing])
            .setStartIndex(10)
            .setEndIndex(11)
            .setText('"')
            .markAsAutocorrectable()
            .build(),
        );
        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
            .addDirections([QuotationDirection.Opening, QuotationDirection.Closing])
            .setStartIndex(15)
            .setEndIndex(16)
            .setText("'")
            .markAsAutocorrectable()
            .build(),
        );
        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirections([QuotationDirection.Opening, QuotationDirection.Closing])
            .setStartIndex(35)
            .setEndIndex(36)
            .setText('"')
            .markAsAutocorrectable()
            .build(),
        );
        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirections([QuotationDirection.Opening, QuotationDirection.Closing])
            .setStartIndex(45)
            .setEndIndex(46)
            .setText('"')
            .markAsAutocorrectable()
            .build(),
        );
        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
            .addDirections([QuotationDirection.Opening, QuotationDirection.Closing])
            .setStartIndex(57)
            .setEndIndex(58)
            .setText("'")
            .markAsAutocorrectable()
            .build(),
        );
        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirections([QuotationDirection.Opening, QuotationDirection.Closing])
            .setStartIndex(58)
            .setEndIndex(59)
            .setText('"')
            .markAsAutocorrectable()
            .build(),
        );
      });

      it('identifies ambiguous quotes in text with other unambiguous quotes', () => {
        const quotationPairIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          'This text "has \u2018multiple levels of \u201Cambiguous" quotations\'\u201D',
        );

        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirections([QuotationDirection.Opening, QuotationDirection.Closing])
            .setStartIndex(10)
            .setEndIndex(11)
            .setText('"')
            .markAsAutocorrectable()
            .build(),
        );
        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(15)
            .setEndIndex(16)
            .setText('\u2018')
            .build(),
        );
        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(35)
            .setEndIndex(36)
            .setText('\u201C')
            .build(),
        );
        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirections([QuotationDirection.Opening, QuotationDirection.Closing])
            .setStartIndex(45)
            .setEndIndex(46)
            .setText('"')
            .markAsAutocorrectable()
            .build(),
        );
        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
            .addDirections([QuotationDirection.Opening, QuotationDirection.Closing])
            .setStartIndex(57)
            .setEndIndex(58)
            .setText("'")
            .markAsAutocorrectable()
            .build(),
        );
        expect(quotationPairIterator.hasNext()).toBe(true);
        expect(quotationPairIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(58)
            .setEndIndex(59)
            .setText('\u201D')
            .build(),
        );
      });
    });

    describe('Identification of ill-formed quotation marks', () => {
      it('identifies quotation marks that are improperly nested', () => {
        const improperlyNestedSecondaryQuoteIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          'This contains an \u2018 improperly nested quote\u2019',
        );
        expect(improperlyNestedSecondaryQuoteIterator.hasNext()).toBe(true);
        expect(improperlyNestedSecondaryQuoteIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(17)
            .setEndIndex(18)
            .setText('\u2018')
            .build(),
        );
        expect(improperlyNestedSecondaryQuoteIterator.hasNext()).toBe(true);
        expect(improperlyNestedSecondaryQuoteIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(42)
            .setEndIndex(43)
            .setText('\u2019')
            .build(),
        );
        expect(improperlyNestedSecondaryQuoteIterator.hasNext()).toBe(false);

        const improperlyNestedTertiaryQuotationIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          '\u201CThis contains an \u201C improperly nested quotation mark.\u201D',
        );
        expect(improperlyNestedTertiaryQuotationIterator.hasNext()).toBe(true);
        expect(improperlyNestedTertiaryQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(0)
            .setEndIndex(1)
            .setText('\u201C')
            .build(),
        );
        expect(improperlyNestedTertiaryQuotationIterator.hasNext()).toBe(true);
        expect(improperlyNestedTertiaryQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(18)
            .setEndIndex(19)
            .setText('\u201C')
            .build(),
        );
        expect(improperlyNestedTertiaryQuotationIterator.hasNext()).toBe(true);
        expect(improperlyNestedTertiaryQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(53)
            .setEndIndex(54)
            .setText('\u201D')
            .build(),
        );
        expect(improperlyNestedTertiaryQuotationIterator.hasNext()).toBe(false);
      });

      it('identifies unpaired quotation marks', () => {
        const unpairedOpeningQuotationIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          '\u201CThis has three \u2018unclosed \u201Cquotations',
        );
        expect(unpairedOpeningQuotationIterator.hasNext()).toBe(true);
        expect(unpairedOpeningQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(0)
            .setEndIndex(1)
            .setText('\u201C')
            .build(),
        );
        expect(unpairedOpeningQuotationIterator.hasNext()).toBe(true);
        expect(unpairedOpeningQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(16)
            .setEndIndex(17)
            .setText('\u2018')
            .build(),
        );
        expect(unpairedOpeningQuotationIterator.hasNext()).toBe(true);
        expect(unpairedOpeningQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(26)
            .setEndIndex(27)
            .setText('\u201C')
            .build(),
        );
        expect(unpairedOpeningQuotationIterator.hasNext()).toBe(false);

        const unpairedClosingQuotationIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          'This has\u201D three\u2019 unpaired\u201D closing quotes',
        );
        expect(unpairedClosingQuotationIterator.hasNext()).toBe(true);
        expect(unpairedClosingQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(8)
            .setEndIndex(9)
            .setText('\u201D')
            .build(),
        );
        expect(unpairedClosingQuotationIterator.hasNext()).toBe(true);
        expect(unpairedClosingQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(15)
            .setEndIndex(16)
            .setText('\u2019')
            .build(),
        );
        expect(unpairedClosingQuotationIterator.hasNext()).toBe(true);
        expect(unpairedClosingQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(25)
            .setEndIndex(26)
            .setText('\u201D')
            .build(),
        );
        expect(unpairedClosingQuotationIterator.hasNext()).toBe(false);
      });

      it('identifies quotation marks that are nested beyond the warning depth', () => {
        const tooDeeplyNestedQuotationIterator: QuotationIterator = new QuotationIterator(
          quotationConfig,
          '\u201CThis has \u2018four \u201Clevels of \u2018quotation marks\u2019\u201D\u2019\u201D',
        );
        expect(tooDeeplyNestedQuotationIterator.hasNext()).toBe(true);
        expect(tooDeeplyNestedQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(0)
            .setEndIndex(1)
            .setText('\u201C')
            .build(),
        );
        expect(tooDeeplyNestedQuotationIterator.hasNext()).toBe(true);
        expect(tooDeeplyNestedQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(10)
            .setEndIndex(11)
            .setText('\u2018')
            .build(),
        );
        expect(tooDeeplyNestedQuotationIterator.hasNext()).toBe(true);
        expect(tooDeeplyNestedQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(16)
            .setEndIndex(17)
            .setText('\u201C')
            .build(),
        );
        expect(tooDeeplyNestedQuotationIterator.hasNext()).toBe(true);
        expect(tooDeeplyNestedQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
            .addDirection(QuotationDirection.Opening)
            .setStartIndex(27)
            .setEndIndex(28)
            .setText('\u2018')
            .build(),
        );
        expect(tooDeeplyNestedQuotationIterator.hasNext()).toBe(true);
        expect(tooDeeplyNestedQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(43)
            .setEndIndex(44)
            .setText('\u2019')
            .build(),
        );
        expect(tooDeeplyNestedQuotationIterator.hasNext()).toBe(true);
        expect(tooDeeplyNestedQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(44)
            .setEndIndex(45)
            .setText('\u201D')
            .build(),
        );
        expect(tooDeeplyNestedQuotationIterator.hasNext()).toBe(true);
        expect(tooDeeplyNestedQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(45)
            .setEndIndex(46)
            .setText('\u2019')
            .build(),
        );
        expect(tooDeeplyNestedQuotationIterator.hasNext()).toBe(true);
        expect(tooDeeplyNestedQuotationIterator.next()).toEqual(
          new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirection(QuotationDirection.Closing)
            .setStartIndex(46)
            .setEndIndex(47)
            .setText('\u201D')
            .build(),
        );
        expect(tooDeeplyNestedQuotationIterator.hasNext()).toBe(false);
      });
    });
  });
});

describe('UnresolvedQuoteMetadata tests', () => {
  describe('Builder tests', () => {
    it("doesn't allow invalid objects to be built", () => {
      const equalIndicesBuilder = new UnresolvedQuoteMetadata.Builder()
        .setStartIndex(5)
        .setEndIndex(5)
        .addDepth(QuotationDepth.Primary)
        .addDirection(QuotationDirection.Opening)
        .setText('\u201C');

      expect(() => equalIndicesBuilder.build()).toThrowError(
        /The endIndex \(5\) for an UnresolvedQuoteMetadata object must be greater than its startIndex \(5\)\./,
      );

      const negativeStartIndexBuilder = new UnresolvedQuoteMetadata.Builder()
        .setStartIndex(-1)
        .setEndIndex(5)
        .addDepth(QuotationDepth.Primary)
        .addDirection(QuotationDirection.Opening)
        .setText('\u201C');

      expect(() => negativeStartIndexBuilder.build()).toThrowError(
        /The startIndex for an UnresolvedQuoteMetadata object must be greater than or equal to 0\./,
      );

      const negativeEndIndexBuilder = new UnresolvedQuoteMetadata.Builder()
        .setStartIndex(5)
        .setEndIndex(-1)
        .addDepth(QuotationDepth.Primary)
        .addDirection(QuotationDirection.Opening)
        .setText('\u201C');

      expect(() => negativeEndIndexBuilder.build()).toThrowError(
        /The endIndex for an UnresolvedQuoteMetadata object must be greater than or equal to 0\./,
      );

      const noDepthsBuilder = new UnresolvedQuoteMetadata.Builder()
        .setStartIndex(4)
        .setEndIndex(5)
        .addDirection(QuotationDirection.Opening)
        .setText('\u201C');

      expect(() => noDepthsBuilder.build()).toThrowError(
        /UnresolvedQuoteMetadata object has no possible quotation depths specified\./,
      );

      const noDirectionsBuilder = new UnresolvedQuoteMetadata.Builder()
        .setStartIndex(4)
        .setEndIndex(5)
        .addDepth(QuotationDepth.Primary)
        .setText('\u201C');

      expect(() => noDirectionsBuilder.build()).toThrowError(
        /UnresolvedQuoteMetadata object has no possible quotation directions specified\./,
      );

      const noTextBuilder = new UnresolvedQuoteMetadata.Builder()
        .setStartIndex(4)
        .setEndIndex(5)
        .addDepth(QuotationDepth.Primary)
        .addDirection(QuotationDirection.Opening);

      expect(() => noTextBuilder.build()).toThrowError(/UnresolvedQuoteMetadata object has no text specified\./);
    });

    it('builds unambiguous objects correctly', () => {
      const unresolvedQuoteMetadata: UnresolvedQuoteMetadata = new UnresolvedQuoteMetadata.Builder()
        .addDepth(QuotationDepth.fromNumber(3))
        .addDirection(QuotationDirection.Opening)
        .setStartIndex(3)
        .setEndIndex(6)
        .setText('\u201C')
        .build();

      expect(unresolvedQuoteMetadata.isDirectionPossible(QuotationDirection.Opening)).toBe(true);
      expect(unresolvedQuoteMetadata.isDirectionPossible(QuotationDirection.Closing)).toBe(false);
      expect(unresolvedQuoteMetadata.isDepthPossible(QuotationDepth.Tertiary)).toBe(true);
      expect(unresolvedQuoteMetadata.isDepthPossible(QuotationDepth.fromNumber(3))).toBe(true);
      expect(unresolvedQuoteMetadata.isDepthPossible(QuotationDepth.Secondary)).toBe(false);
      expect(unresolvedQuoteMetadata.numPossibleDepths()).toEqual(1);
      expect(unresolvedQuoteMetadata.numPossibleDirections()).toEqual(1);
      expect(unresolvedQuoteMetadata.resolve(QuotationDepth.fromNumber(3), QuotationDirection.Opening)).toEqual({
        depth: QuotationDepth.Tertiary,
        direction: QuotationDirection.Opening,
        startIndex: 3,
        endIndex: 6,
        text: '\u201C',
        isAutocorrectable: false,
      });
    });

    it('builds ambiguous objects correctly', () => {
      const unresolvedQuoteMetadata: UnresolvedQuoteMetadata = new UnresolvedQuoteMetadata.Builder()
        .addDepth(QuotationDepth.fromNumber(3))
        .addDepth(QuotationDepth.fromNumber(1))
        .addDirection(QuotationDirection.Opening)
        .addDirection(QuotationDirection.Closing)
        .setStartIndex(3)
        .setEndIndex(6)
        .setText('"')
        .markAsAutocorrectable()
        .build();

      expect(unresolvedQuoteMetadata.isDirectionPossible(QuotationDirection.Opening)).toBe(true);
      expect(unresolvedQuoteMetadata.isDirectionPossible(QuotationDirection.Closing)).toBe(true);
      expect(unresolvedQuoteMetadata.isDirectionPossible(QuotationDirection.Ambiguous)).toBe(false);
      expect(unresolvedQuoteMetadata.isDepthPossible(QuotationDepth.Tertiary)).toBe(true);
      expect(unresolvedQuoteMetadata.isDepthPossible(QuotationDepth.fromNumber(3))).toBe(true);
      expect(unresolvedQuoteMetadata.isDepthPossible(QuotationDepth.fromNumber(1))).toBe(true);
      expect(unresolvedQuoteMetadata.isDepthPossible(QuotationDepth.Secondary)).toBe(false);
      expect(unresolvedQuoteMetadata.numPossibleDepths()).toEqual(2);
      expect(unresolvedQuoteMetadata.numPossibleDirections()).toEqual(2);
      expect(unresolvedQuoteMetadata.resolve(QuotationDepth.fromNumber(3), QuotationDirection.Opening)).toEqual({
        depth: QuotationDepth.Tertiary,
        direction: QuotationDirection.Opening,
        startIndex: 3,
        endIndex: 6,
        text: '"',
        isAutocorrectable: true,
      });

      // also test adding multiple depths and directions at once
      const groupAddUnresolvedQuoteMetadata: UnresolvedQuoteMetadata = new UnresolvedQuoteMetadata.Builder()
        .addDepths([QuotationDepth.fromNumber(3), QuotationDepth.fromNumber(1)])
        .addDirections([QuotationDirection.Opening, QuotationDirection.Closing])
        .setStartIndex(3)
        .setEndIndex(6)
        .setText('"')
        .markAsAutocorrectable()
        .build();

      expect(groupAddUnresolvedQuoteMetadata.isDirectionPossible(QuotationDirection.Opening)).toBe(true);
      expect(groupAddUnresolvedQuoteMetadata.isDirectionPossible(QuotationDirection.Closing)).toBe(true);
      expect(groupAddUnresolvedQuoteMetadata.isDirectionPossible(QuotationDirection.Ambiguous)).toBe(false);
      expect(groupAddUnresolvedQuoteMetadata.isDepthPossible(QuotationDepth.Tertiary)).toBe(true);
      expect(groupAddUnresolvedQuoteMetadata.isDepthPossible(QuotationDepth.fromNumber(3))).toBe(true);
      expect(groupAddUnresolvedQuoteMetadata.isDepthPossible(QuotationDepth.fromNumber(1))).toBe(true);
      expect(groupAddUnresolvedQuoteMetadata.isDepthPossible(QuotationDepth.Secondary)).toBe(false);
      expect(groupAddUnresolvedQuoteMetadata.numPossibleDepths()).toEqual(2);
      expect(groupAddUnresolvedQuoteMetadata.numPossibleDirections()).toEqual(2);
      expect(groupAddUnresolvedQuoteMetadata.resolve(QuotationDepth.fromNumber(3), QuotationDirection.Opening)).toEqual(
        {
          depth: QuotationDepth.Tertiary,
          direction: QuotationDirection.Opening,
          startIndex: 3,
          endIndex: 6,
          text: '"',
          isAutocorrectable: true,
        },
      );
    });
  });

  const unresolvedQuoteMetadata: UnresolvedQuoteMetadata = new UnresolvedQuoteMetadata.Builder()
    .addDepth(QuotationDepth.fromNumber(3))
    .addDepth(QuotationDepth.fromNumber(1))
    .addDirection(QuotationDirection.Opening)
    .addDirection(QuotationDirection.Closing)
    .setStartIndex(3)
    .setEndIndex(6)
    .setText('"')
    .markAsAutocorrectable()
    .build();

  it('gives the correct number of options for depth and direction', () => {
    expect(unresolvedQuoteMetadata.numPossibleDepths()).toEqual(2);
    expect(unresolvedQuoteMetadata.numPossibleDirections()).toEqual(2);

    const evenMoreUnresolvedQuoteMetadata: UnresolvedQuoteMetadata = new UnresolvedQuoteMetadata.Builder()
      .addDepth(QuotationDepth.fromNumber(3))
      .addDepth(QuotationDepth.fromNumber(1))
      .addDepth(QuotationDepth.fromNumber(2))
      .addDirection(QuotationDirection.Opening)
      .addDirection(QuotationDirection.Closing)
      .setStartIndex(3)
      .setEndIndex(6)
      .setText('"')
      .build();

    expect(evenMoreUnresolvedQuoteMetadata.numPossibleDepths()).toEqual(3);
    expect(evenMoreUnresolvedQuoteMetadata.numPossibleDirections()).toEqual(2);
  });

  it('tells whether the given depth/direction is possible', () => {
    expect(unresolvedQuoteMetadata.isDepthPossible(QuotationDepth.Primary)).toBe(true);
    expect(unresolvedQuoteMetadata.isDepthPossible(QuotationDepth.Secondary)).toBe(false);
    expect(unresolvedQuoteMetadata.isDepthPossible(QuotationDepth.Tertiary)).toBe(true);
    expect(unresolvedQuoteMetadata.isDepthPossible(QuotationDepth.fromNumber(4))).toBe(false);
    expect(unresolvedQuoteMetadata.isDirectionPossible(QuotationDirection.Opening)).toBe(true);
    expect(unresolvedQuoteMetadata.isDirectionPossible(QuotationDirection.Closing)).toBe(true);
    expect(unresolvedQuoteMetadata.isDirectionPossible(QuotationDirection.Ambiguous)).toBe(false);
  });

  it('resolves into a QuoteMetadata object with the choices specified', () => {
    expect(unresolvedQuoteMetadata.resolve(QuotationDepth.fromNumber(1), QuotationDirection.Opening)).toEqual({
      depth: QuotationDepth.Primary,
      direction: QuotationDirection.Opening,
      startIndex: 3,
      endIndex: 6,
      text: '"',
      isAutocorrectable: true,
    });
    expect(unresolvedQuoteMetadata.resolve(QuotationDepth.fromNumber(3), QuotationDirection.Opening)).toEqual({
      depth: QuotationDepth.Tertiary,
      direction: QuotationDirection.Opening,
      startIndex: 3,
      endIndex: 6,
      text: '"',
      isAutocorrectable: true,
    });
    expect(unresolvedQuoteMetadata.resolve(QuotationDepth.fromNumber(1), QuotationDirection.Closing)).toEqual({
      depth: QuotationDepth.Primary,
      direction: QuotationDirection.Closing,
      startIndex: 3,
      endIndex: 6,
      text: '"',
      isAutocorrectable: true,
    });
    expect(unresolvedQuoteMetadata.resolve(QuotationDepth.fromNumber(3), QuotationDirection.Closing)).toEqual({
      depth: QuotationDepth.Tertiary,
      direction: QuotationDirection.Closing,
      startIndex: 3,
      endIndex: 6,
      text: '"',
      isAutocorrectable: true,
    });
  });

  it('selects the best depth when given a scoring function', () => {
    expect(unresolvedQuoteMetadata.findBestDepth((depth: QuotationDepth) => depth.asNumber())).toEqual(
      QuotationDepth.fromNumber(3),
    );
    expect(unresolvedQuoteMetadata.findBestDepth((depth: QuotationDepth) => -depth.asNumber())).toEqual(
      QuotationDepth.fromNumber(1),
    );
    // In the case of a tie, the earliest added depth should win
    expect(unresolvedQuoteMetadata.findBestDepth((_depth: QuotationDepth) => 0)).toEqual(QuotationDepth.fromNumber(3));
  });

  it('selects the best direction when given a scoring function', () => {
    expect(
      unresolvedQuoteMetadata.findBestDirection((direction: QuotationDirection) =>
        direction === QuotationDirection.Opening ? 1 : 0,
      ),
    ).toEqual(QuotationDirection.Opening);
    expect(
      unresolvedQuoteMetadata.findBestDirection((direction: QuotationDirection) =>
        direction === QuotationDirection.Opening ? -55 : -50,
      ),
    ).toEqual(QuotationDirection.Closing);
    // In the case of a tie, the earliest inserted direction should win
    expect(unresolvedQuoteMetadata.findBestDirection((_direction: QuotationDirection) => 0)).toEqual(
      QuotationDirection.Opening,
    );
  });

  it('errors when it cannot be resolved as called', () => {
    expect(() =>
      unresolvedQuoteMetadata.resolve(QuotationDepth.fromNumber(2), QuotationDirection.Opening),
    ).toThrowError('Cannot resolve quote metadata with depth 2, as this depth is not possible.');
    expect(() => unresolvedQuoteMetadata.resolve(QuotationDepth.fromNumber(3), QuotationDirection.Ambiguous)).toThrow(
      'Cannot resolve quote metadata with direction 3 as this direction is not possible',
    );
  });
});

describe('QuotationDepth tests', () => {
  it('has equivalent static instances', () => {
    expect(QuotationDepth.Primary).toEqual(QuotationDepth.fromNumber(1));
    expect(QuotationDepth.Secondary).toEqual(QuotationDepth.fromNumber(2));
    expect(QuotationDepth.Tertiary).toEqual(QuotationDepth.fromNumber(3));
  });

  it("doesn't allow invalid objects to be created", () => {
    expect(() => QuotationDepth.fromNumber(0)).toThrowError(
      /Depth of quotation cannot be less than 1\. Provided depth was 0\./,
    );
    expect(() => QuotationDepth.fromNumber(-1)).toThrowError(
      /Depth of quotation cannot be less than 1\. Provided depth was -1\./,
    );
    expect(() => QuotationDepth.fromNumber(1.5)).toThrowError(
      /Depth of quotation must be an integer. Provided depth was 1.5./,
    );
  });

  it('returns the specified depth when asNumber() is called', () => {
    expect(QuotationDepth.fromNumber(5).asNumber()).toEqual(5);
    expect(QuotationDepth.fromNumber(3).asNumber()).toEqual(3);
  });

  it('gives a corresponding name for each depth', () => {
    expect(QuotationDepth.fromNumber(1).name()).toEqual('Primary');
    expect(QuotationDepth.fromNumber(2).name()).toEqual('Secondary');
    expect(QuotationDepth.fromNumber(3).name()).toEqual('Tertiary');
    expect(QuotationDepth.fromNumber(4).name()).toEqual('4th-level');
    expect(QuotationDepth.fromNumber(5).name()).toEqual('5th-level');
    expect(QuotationDepth.fromNumber(6).name()).toEqual('6th-level');
  });

  it('returns QuotationDepth objects representing one level shallower or deeper', () => {
    expect(QuotationDepth.fromNumber(3).shallower()).toEqual(QuotationDepth.fromNumber(2));
    expect(QuotationDepth.fromNumber(3).deeper()).toEqual(QuotationDepth.fromNumber(4));
    expect(() => QuotationDepth.fromNumber(1).shallower()).toThrowError(
      /Depth of quotation cannot be less than 1\. Provided depth was 0\./,
    );
  });

  it('has a special class for the root depth that can only be explicitly created', () => {
    expect(new QuotationRootLevel().asNumber()).toEqual(0);
    expect(new QuotationRootLevel().name()).toEqual('Root level');
    expect(new QuotationRootLevel().deeper()).toEqual(QuotationDepth.Primary);
    expect(() => new QuotationRootLevel().deeper().shallower()).toThrowError(
      /Depth of quotation cannot be less than 1\. Provided depth was 0\./,
    );
  });
});
