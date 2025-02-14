import { ScriptureNode, ScriptureText } from '@sillsdev/lynx';
import { describe, expect, it } from 'vitest';

import { CheckableGroup, ScriptureNodeCheckable, TextDocumentCheckable } from '../../src/checkable';
import { QuotationConfig } from '../../src/quotation/quotation-config';
import {
  QuotationDepth,
  QuotationIterator,
  QuotationRootLevel,
  UnresolvedQuoteMetadata,
} from '../../src/quotation/quotation-utils';
import { PairedPunctuationDirection, StringContextMatcher } from '../../src/utils';

describe('QuotationIterator tests', () => {
  describe('Plain text quotation mark identification', () => {
    describe('Top-level English quotation marks', () => {
      describe('Identification of unpaired quotation marks', () => {
        it('does not identify quotes in quote-less text', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithTopLevelQuotesAndNoAmbiguity();
          const emptyStringIterator: QuotationIterator = testEnv.newQuotationIterator(testEnv.createTextInput(''));
          expect(emptyStringIterator.next()).toEqual({
            done: true,
            value: undefined,
          });

          const noQuotationsIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('There are no quotes in this text.'),
          );
          expect(noQuotationsIterator.next()).toEqual({
            done: true,
            value: undefined,
          });
        });

        it('identifies unpaired quotation marks in otherwise empty strings', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithTopLevelQuotesAndNoAmbiguity();

          const openingQuotationIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('\u201C'),
          );
          expect(openingQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(0)
              .setEndIndex(1)
              .setText('\u201C')
              .build(),
          });
          expect(openingQuotationIterator.next()).toEqual({ done: true, value: undefined });

          const closingQuotationIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('\u201D'),
          );
          expect(closingQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(0)
              .setEndIndex(1)
              .setText('\u201D')
              .build(),
          });
          expect(closingQuotationIterator.next()).toEqual({ done: true, value: undefined });
        });

        it('identifies unpaired quotation marks in non-empty strings', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithTopLevelQuotesAndNoAmbiguity();

          const previousContextOpeningQuotationIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('Extra text, \u201C'),
          );
          expect(previousContextOpeningQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(12)
              .setEndIndex(13)
              .setText('\u201C')
              .build(),
          });
          expect(previousContextOpeningQuotationIterator.next()).toEqual({ done: true, value: undefined });

          const trailingContextOpeningQuotationIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('\u201CWith extra text at the end'),
          );
          expect(trailingContextOpeningQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(0)
              .setEndIndex(1)
              .setText('\u201C')
              .build(),
          });
          expect(trailingContextOpeningQuotationIterator.next()).toEqual({ done: true, value: undefined });

          const twoSidedContextOpeningQuotationIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('Text at the start, \u201CWith extra text at the end'),
          );
          expect(twoSidedContextOpeningQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(19)
              .setEndIndex(20)
              .setText('\u201C')
              .build(),
          });
          expect(twoSidedContextOpeningQuotationIterator.next()).toEqual({ done: true, value: undefined });

          const previousContextClosingQuotationIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput(' starting text\u201D'),
          );
          expect(previousContextClosingQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(14)
              .setEndIndex(15)
              .setText('\u201D')
              .build(),
          });
          expect(previousContextClosingQuotationIterator.next()).toEqual({ done: true, value: undefined });

          const trailingContextClosingQuotationIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('\u201Dwith extra at the end.'),
          );
          expect(trailingContextClosingQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(0)
              .setEndIndex(1)
              .setText('\u201D')
              .build(),
          });
          expect(trailingContextClosingQuotationIterator.next()).toEqual({ done: true, value: undefined });

          const twoSidedContextClosingQuotationIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('Prior text \u201Dwith extra at the end.'),
          );
          expect(twoSidedContextClosingQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(11)
              .setEndIndex(12)
              .setText('\u201D')
              .build(),
          });
          expect(twoSidedContextClosingQuotationIterator.next()).toEqual({ done: true, value: undefined });
        });

        it('does not depend on correct formatting of whitespace', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithTopLevelQuotesAndNoAmbiguity();

          const noWhitespaceOpeningQuotationIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('Text immediately prior\u201Cwith text immediately afterward'),
          );
          expect(noWhitespaceOpeningQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(22)
              .setEndIndex(23)
              .setText('\u201C')
              .build(),
          });
          expect(noWhitespaceOpeningQuotationIterator.next()).toEqual({ done: true, value: undefined });

          const reversedWhitespaceOpeningQuotationIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('No previous space\u201C but a space afterward'),
          );
          expect(reversedWhitespaceOpeningQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(17)
              .setEndIndex(18)
              .setText('\u201C')
              .build(),
          });
          expect(reversedWhitespaceOpeningQuotationIterator.next()).toEqual({ done: true, value: undefined });

          const noWhitespaceClosingQuotationIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('Text immediately prior\u201Dwith text immediately afterward'),
          );
          expect(noWhitespaceClosingQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(22)
              .setEndIndex(23)
              .setText('\u201D')
              .build(),
          });
          expect(noWhitespaceClosingQuotationIterator.next()).toEqual({ done: true, value: undefined });

          const reversedWhitespaceClosingQuotationIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('A previous space \u201Dbut no space afterward'),
          );
          expect(reversedWhitespaceClosingQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(17)
              .setEndIndex(18)
              .setText('\u201D')
              .build(),
          });
          expect(reversedWhitespaceClosingQuotationIterator.next()).toEqual({ done: true, value: undefined });
        });
      });

      describe('Identification of multiple quotation marks', () => {
        it('identifies a pair of quotation marks in otherwise empty strings', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithTopLevelQuotesAndNoAmbiguity();
          const quotationPairIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('\u201C\u201D'),
          );
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(0)
              .setEndIndex(1)
              .setText('\u201C')
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(1)
              .setEndIndex(2)
              .setText('\u201D')
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({ done: true, value: undefined });
        });

        it('identifies a pair of quotation marks in non-empty strings', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithTopLevelQuotesAndNoAmbiguity();
          const quotationPairIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('\u201CSample text.\u201D'),
          );
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(0)
              .setEndIndex(1)
              .setText('\u201C')
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(13)
              .setEndIndex(14)
              .setText('\u201D')
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({ done: true, value: undefined });

          const previousContextQuotationPairIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('Context on the left, \u201CSample text.\u201D'),
          );
          expect(previousContextQuotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(21)
              .setEndIndex(22)
              .setText('\u201C')
              .build(),
          });
          expect(previousContextQuotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(34)
              .setEndIndex(35)
              .setText('\u201D')
              .build(),
          });
          expect(previousContextQuotationPairIterator.next()).toEqual({ done: true, value: undefined });

          const trailingContextQuotationPairIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('\u201CSample text.\u201D with context on the right.'),
          );
          expect(trailingContextQuotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(0)
              .setEndIndex(1)
              .setText('\u201C')
              .build(),
          });
          expect(trailingContextQuotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(13)
              .setEndIndex(14)
              .setText('\u201D')
              .build(),
          });
          expect(trailingContextQuotationPairIterator.next()).toEqual({ done: true, value: undefined });

          const twoSidedContextQuotationPairIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('Context on the left, \u201CSample text.\u201D with context on the right'),
          );
          expect(twoSidedContextQuotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(21)
              .setEndIndex(22)
              .setText('\u201C')
              .build(),
          });
          expect(twoSidedContextQuotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(34)
              .setEndIndex(35)
              .setText('\u201D')
              .build(),
          });
          expect(twoSidedContextQuotationPairIterator.next()).toEqual({ done: true, value: undefined });
        });

        it('identifies multiple pairs of quotation marks', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithTopLevelQuotesAndNoAmbiguity();

          const quotationPairIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('\u201CSample text.\u201D and, \u201Cmore sample text\u201D'),
          );
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(0)
              .setEndIndex(1)
              .setText('\u201C')
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(13)
              .setEndIndex(14)
              .setText('\u201D')
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(20)
              .setEndIndex(21)
              .setText('\u201C')
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(37)
              .setEndIndex(38)
              .setText('\u201D')
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({ done: true, value: undefined });
        });
      });

      describe('Identification of ambiguous quotation marks', () => {
        it('identifies ambiguous quotes in text with no unambiguous quotes', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithTopLevelQuotes();

          const singleQuotationIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('Sample" text.'),
          );
          expect(singleQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Opening)
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(6)
              .setEndIndex(7)
              .setText('"')
              .markAsAutocorrectable()
              .build(),
          });
          expect(singleQuotationIterator.next()).toEqual({ done: true, value: undefined });

          const quotationPairIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('"Sample text."'),
          );
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Opening)
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(0)
              .setEndIndex(1)
              .setText('"')
              .markAsAutocorrectable()
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Opening)
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(13)
              .setEndIndex(14)
              .setText('"')
              .markAsAutocorrectable()
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({ done: true, value: undefined });
        });

        it('identifies ambiguous quotes in text containing unambiugous quotes', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithTopLevelQuotes();

          const mixedQuotationIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('This text \u201Ccontains "straight" and curly quotes.\u201D'),
          );
          expect(mixedQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(10)
              .setEndIndex(11)
              .setText('\u201C')
              .build(),
          });
          expect(mixedQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Opening)
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(20)
              .setEndIndex(21)
              .setText('"')
              .markAsAutocorrectable()
              .build(),
          });
          expect(mixedQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Opening)
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(29)
              .setEndIndex(30)
              .setText('"')
              .markAsAutocorrectable()
              .build(),
          });
          expect(mixedQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(48)
              .setEndIndex(49)
              .setText('\u201D')
              .build(),
          });
          expect(mixedQuotationIterator.next()).toEqual({ done: true, value: undefined });
        });
      });

      describe('Identification of ill-formed quotation marks', () => {
        it('identifies quotation marks that are improperly nested', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithTopLevelQuotesAndNoAmbiguity();
          const improperlyNestedOpeningQuotationIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('\u201CThis contains an \u201C improperly nested quotation mark.\u201D'),
          );
          expect(improperlyNestedOpeningQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(0)
              .setEndIndex(1)
              .setText('\u201C')
              .build(),
          });
          expect(improperlyNestedOpeningQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(18)
              .setEndIndex(19)
              .setText('\u201C')
              .build(),
          });
          expect(improperlyNestedOpeningQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(53)
              .setEndIndex(54)
              .setText('\u201D')
              .build(),
          });
          expect(improperlyNestedOpeningQuotationIterator.next()).toEqual({ done: true, value: undefined });

          const improperlyNestedClosingQuotationIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('\u201CThis contains an \u201D improperly nested quotation mark.\u201D'),
          );
          expect(improperlyNestedClosingQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(0)
              .setEndIndex(1)
              .setText('\u201C')
              .build(),
          });
          expect(improperlyNestedClosingQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(18)
              .setEndIndex(19)
              .setText('\u201D')
              .build(),
          });
          expect(improperlyNestedClosingQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(53)
              .setEndIndex(54)
              .setText('\u201D')
              .build(),
          });
          expect(improperlyNestedClosingQuotationIterator.next()).toEqual({ done: true, value: undefined });
        });

        it('identifies unpaired quotation marks', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithTopLevelQuotesAndNoAmbiguity();
          const unpairedOpeningQuotationIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('\u201CThe second quotation mark\u201D is \u201C never closed.'),
          );
          expect(unpairedOpeningQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(0)
              .setEndIndex(1)
              .setText('\u201C')
              .build(),
          });
          expect(unpairedOpeningQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(26)
              .setEndIndex(27)
              .setText('\u201D')
              .build(),
          });
          expect(unpairedOpeningQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(31)
              .setEndIndex(32)
              .setText('\u201C')
              .build(),
          });
          expect(unpairedOpeningQuotationIterator.next()).toEqual({ done: true, value: undefined });

          const unpairedClosingQuotationIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('The first \u201D quotation mark \u201Cis unpaired.\u201D'),
          );
          expect(unpairedClosingQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(10)
              .setEndIndex(11)
              .setText('\u201D')
              .build(),
          });
          expect(unpairedClosingQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(27)
              .setEndIndex(28)
              .setText('\u201C')
              .build(),
          });
          expect(unpairedClosingQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(40)
              .setEndIndex(41)
              .setText('\u201D')
              .build(),
          });
          expect(unpairedClosingQuotationIterator.next()).toEqual({ done: true, value: undefined });
        });
      });

      describe('Adherence to the QuotationConfig', () => {
        it('does not identify single quotes', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithTopLevelQuotesAndNoAmbiguity();
          const singleQuotationIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('\u2018single quoted text\u2019'),
          );
          expect(singleQuotationIterator.next()).toEqual({ done: true, value: undefined });

          const singleAndDoubleQuotationIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('\u201Cdouble and \u2018single quoted text\u201D'),
          );
          expect(singleAndDoubleQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(0)
              .setEndIndex(1)
              .setText('\u201C')
              .build(),
          });
          expect(singleAndDoubleQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(31)
              .setEndIndex(32)
              .setText('\u201D')
              .build(),
          });
          expect(singleAndDoubleQuotationIterator.next()).toEqual({ done: true, value: undefined });
        });

        it('does not identify straight quotes', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithTopLevelQuotesAndNoAmbiguity();
          const straightDoubleQuoteIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('"straight double quotes"'),
          );
          expect(straightDoubleQuoteIterator.next()).toEqual({ done: true, value: undefined });

          const straightSingleQuoteIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput("'straight double quotes'"),
          );
          expect(straightSingleQuoteIterator.next()).toEqual({ done: true, value: undefined });

          const curlyAndStraightDoubleQuoteIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('\u201Ccurly and straight quotes used here"'),
          );
          expect(curlyAndStraightDoubleQuoteIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(0)
              .setEndIndex(1)
              .setText('\u201C')
              .build(),
          });
          expect(curlyAndStraightDoubleQuoteIterator.next()).toEqual({ done: true, value: undefined });

          const curlyDoubleAndStraightSingleQuoteIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput("\u201Ccurly double and 'straight' quotes used here"),
          );
          expect(curlyDoubleAndStraightSingleQuoteIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepth(QuotationDepth.Primary)
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(0)
              .setEndIndex(1)
              .setText('\u201C')
              .build(),
          });
          expect(curlyDoubleAndStraightSingleQuoteIterator.next()).toEqual({ done: true, value: undefined });
        });

        it('does not identify alternative top-level quotes', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithTopLevelQuotesAndNoAmbiguity();
          const guillemetsIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('\u00ABFrench-style guillemets\u00BB'),
          );
          expect(guillemetsIterator.next()).toEqual({ done: true, value: undefined });

          const germanQuotesIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('\u201EGerman-style quotes\u201F'),
          );
          expect(germanQuotesIterator.next()).toEqual({ done: true, value: undefined });
        });
      });
    });

    describe('Multi-level English quotation marks', () => {
      it('skips over apostrophes', () => {
        const testEnv: TestEnvironment = TestEnvironment.createWithFullEnglishQuotes();
        const basicPossessiveIterator: QuotationIterator = testEnv.newQuotationIterator(
          testEnv.createTextInput("Abraham's servant"),
        );
        expect(basicPossessiveIterator.next()).toEqual({ done: true, value: undefined });

        const basicPossessiveIterator2: QuotationIterator = testEnv.newQuotationIterator(
          testEnv.createTextInput('Abraham\u2019s servant'),
        );
        expect(basicPossessiveIterator2.next()).toEqual({ done: true, value: undefined });

        const basicContractionIterator: QuotationIterator = testEnv.newQuotationIterator(
          testEnv.createTextInput("they're"),
        );
        expect(basicContractionIterator.next()).toEqual({ done: true, value: undefined });

        const basicContractionIterator2: QuotationIterator = testEnv.newQuotationIterator(
          testEnv.createTextInput('they\u2019re'),
        );
        expect(basicContractionIterator2.next()).toEqual({ done: true, value: undefined });

        const sPossessiveIterator: QuotationIterator = testEnv.newQuotationIterator(
          testEnv.createTextInput("your sons' wives"),
        );
        expect(sPossessiveIterator.next()).toEqual({ done: true, value: undefined });

        const sPossessiveIterator2: QuotationIterator = testEnv.newQuotationIterator(
          testEnv.createTextInput('your sons\u2019 wives'),
        );
        expect(sPossessiveIterator2.next()).toEqual({ done: true, value: undefined });

        const quotedApostropheIterator: QuotationIterator = testEnv.newQuotationIterator(
          testEnv.createTextInput('\u201CThis is one of the Hebrews\u2019 children.\u201D'),
        );
        expect(quotedApostropheIterator.next()).toEqual({
          done: false,
          value: new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirection(PairedPunctuationDirection.Opening)
            .setStartIndex(0)
            .setEndIndex(1)
            .setText('\u201C')
            .build(),
        });
        expect(quotedApostropheIterator.next()).toEqual({
          done: false,
          value: new UnresolvedQuoteMetadata.Builder()
            .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
            .addDirection(PairedPunctuationDirection.Closing)
            .setStartIndex(38)
            .setEndIndex(39)
            .setText('\u201D')
            .build(),
        });
        expect(quotedApostropheIterator.next()).toEqual({ done: true, value: undefined });
      });

      describe('Identification of multiple quotation marks', () => {
        it('identifies multiple levels of quotes in otherwise empty text', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithFullEnglishQuotes();
          const quotationPairIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('\u201C\u2018\u2019\u201D'),
          );
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(0)
              .setEndIndex(1)
              .setText('\u201C')
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(1)
              .setEndIndex(2)
              .setText('\u2018')
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(2)
              .setEndIndex(3)
              .setText('\u2019')
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(3)
              .setEndIndex(4)
              .setText('\u201D')
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({ done: true, value: undefined });

          const threeLevelQuotationPairIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('\u201C\u2018\u201C\u201D\u2019\u201D'),
          );
          expect(threeLevelQuotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(0)
              .setEndIndex(1)
              .setText('\u201C')
              .build(),
          });
          expect(threeLevelQuotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(1)
              .setEndIndex(2)
              .setText('\u2018')
              .build(),
          });
          expect(threeLevelQuotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(2)
              .setEndIndex(3)
              .setText('\u201C')
              .build(),
          });
          expect(threeLevelQuotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(3)
              .setEndIndex(4)
              .setText('\u201D')
              .build(),
          });
          expect(threeLevelQuotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(4)
              .setEndIndex(5)
              .setText('\u2019')
              .build(),
          });
          expect(threeLevelQuotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(5)
              .setEndIndex(6)
              .setText('\u201D')
              .build(),
          });
          expect(threeLevelQuotationPairIterator.next()).toEqual({ done: true, value: undefined });
        });

        it('identifies multiple levels of quotes in non-empty text', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithFullEnglishQuotes();

          const quotationPairIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('\u201CThis text \u2018contains multiple\u2019 quote levels\u201D'),
          );
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(0)
              .setEndIndex(1)
              .setText('\u201C')
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(11)
              .setEndIndex(12)
              .setText('\u2018')
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(29)
              .setEndIndex(30)
              .setText('\u2019')
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(43)
              .setEndIndex(44)
              .setText('\u201D')
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({ done: true, value: undefined });

          const threeLevelQuotationPairIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('\u201CThis text \u2018has \u201Cthree levels\u201D of quotations\u2019\u201D'),
          );
          expect(threeLevelQuotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(0)
              .setEndIndex(1)
              .setText('\u201C')
              .build(),
          });
          expect(threeLevelQuotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(11)
              .setEndIndex(12)
              .setText('\u2018')
              .build(),
          });
          expect(threeLevelQuotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(16)
              .setEndIndex(17)
              .setText('\u201C')
              .build(),
          });
          expect(threeLevelQuotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(29)
              .setEndIndex(30)
              .setText('\u201D')
              .build(),
          });
          expect(threeLevelQuotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(44)
              .setEndIndex(45)
              .setText('\u2019')
              .build(),
          });
          expect(threeLevelQuotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(45)
              .setEndIndex(46)
              .setText('\u201D')
              .build(),
          });
          expect(threeLevelQuotationPairIterator.next()).toEqual({ done: true, value: undefined });
        });
      });

      describe('Identification of ambiguous quotation marks', () => {
        it('identifies ambiguous quotes in text with no unambiguous quotes', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithFullEnglishQuotes();

          const quotationPairIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('This text "has \'multiple levels of "ambiguous" quotations\'"'),
          );
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirections([PairedPunctuationDirection.Opening, PairedPunctuationDirection.Closing])
              .setStartIndex(10)
              .setEndIndex(11)
              .setText('"')
              .markAsAutocorrectable()
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
              .addDirections([PairedPunctuationDirection.Opening, PairedPunctuationDirection.Closing])
              .setStartIndex(15)
              .setEndIndex(16)
              .setText("'")
              .markAsAutocorrectable()
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirections([PairedPunctuationDirection.Opening, PairedPunctuationDirection.Closing])
              .setStartIndex(35)
              .setEndIndex(36)
              .setText('"')
              .markAsAutocorrectable()
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirections([PairedPunctuationDirection.Opening, PairedPunctuationDirection.Closing])
              .setStartIndex(45)
              .setEndIndex(46)
              .setText('"')
              .markAsAutocorrectable()
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
              .addDirections([PairedPunctuationDirection.Opening, PairedPunctuationDirection.Closing])
              .setStartIndex(57)
              .setEndIndex(58)
              .setText("'")
              .markAsAutocorrectable()
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirections([PairedPunctuationDirection.Opening, PairedPunctuationDirection.Closing])
              .setStartIndex(58)
              .setEndIndex(59)
              .setText('"')
              .markAsAutocorrectable()
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({ done: true, value: undefined });
        });

        it('identifies ambiguous quotes in text with other unambiguous quotes', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithFullEnglishQuotes();

          const quotationPairIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('This text "has \u2018multiple levels of \u201Cambiguous" quotations\'\u201D'),
          );
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirections([PairedPunctuationDirection.Opening, PairedPunctuationDirection.Closing])
              .setStartIndex(10)
              .setEndIndex(11)
              .setText('"')
              .markAsAutocorrectable()
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(15)
              .setEndIndex(16)
              .setText('\u2018')
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(35)
              .setEndIndex(36)
              .setText('\u201C')
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirections([PairedPunctuationDirection.Opening, PairedPunctuationDirection.Closing])
              .setStartIndex(45)
              .setEndIndex(46)
              .setText('"')
              .markAsAutocorrectable()
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
              .addDirections([PairedPunctuationDirection.Opening, PairedPunctuationDirection.Closing])
              .setStartIndex(57)
              .setEndIndex(58)
              .setText("'")
              .markAsAutocorrectable()
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(58)
              .setEndIndex(59)
              .setText('\u201D')
              .build(),
          });
          expect(quotationPairIterator.next()).toEqual({ done: true, value: undefined });
        });
      });

      describe('Identification of ill-formed quotation marks', () => {
        it('identifies quotation marks that are improperly nested', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithFullEnglishQuotes();

          const improperlyNestedSecondaryQuoteIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('This contains an \u2018 improperly nested quote\u2019'),
          );
          expect(improperlyNestedSecondaryQuoteIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(17)
              .setEndIndex(18)
              .setText('\u2018')
              .build(),
          });
          expect(improperlyNestedSecondaryQuoteIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(42)
              .setEndIndex(43)
              .setText('\u2019')
              .build(),
          });
          expect(improperlyNestedSecondaryQuoteIterator.next()).toEqual({ done: true, value: undefined });

          const improperlyNestedTertiaryQuotationIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('\u201CThis contains an \u201C improperly nested quotation mark.\u201D'),
          );
          expect(improperlyNestedTertiaryQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(0)
              .setEndIndex(1)
              .setText('\u201C')
              .build(),
          });
          expect(improperlyNestedTertiaryQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(18)
              .setEndIndex(19)
              .setText('\u201C')
              .build(),
          });
          expect(improperlyNestedTertiaryQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(53)
              .setEndIndex(54)
              .setText('\u201D')
              .build(),
          });
          expect(improperlyNestedTertiaryQuotationIterator.next()).toEqual({ done: true, value: undefined });
        });

        it('identifies unpaired quotation marks', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithFullEnglishQuotes();

          const unpairedOpeningQuotationIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('\u201CThis has three \u2018unclosed \u201Cquotations'),
          );
          expect(unpairedOpeningQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(0)
              .setEndIndex(1)
              .setText('\u201C')
              .build(),
          });
          expect(unpairedOpeningQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(16)
              .setEndIndex(17)
              .setText('\u2018')
              .build(),
          });
          expect(unpairedOpeningQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(26)
              .setEndIndex(27)
              .setText('\u201C')
              .build(),
          });
          expect(unpairedOpeningQuotationIterator.next()).toEqual({ done: true, value: undefined });

          const unpairedClosingQuotationIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput('This has\u201D three\u2019 unpaired\u201D closing quotes'),
          );
          expect(unpairedClosingQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(8)
              .setEndIndex(9)
              .setText('\u201D')
              .build(),
          });
          expect(unpairedClosingQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(15)
              .setEndIndex(16)
              .setText('\u2019')
              .build(),
          });
          expect(unpairedClosingQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(25)
              .setEndIndex(26)
              .setText('\u201D')
              .build(),
          });
          expect(unpairedClosingQuotationIterator.next()).toEqual({ done: true, value: undefined });
        });

        it('identifies quotation marks that are nested beyond the warning depth', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithFullEnglishQuotes();

          const tooDeeplyNestedQuotationIterator: QuotationIterator = testEnv.newQuotationIterator(
            testEnv.createTextInput(
              '\u201CThis has \u2018four \u201Clevels of \u2018quotation marks\u2019\u201D\u2019\u201D',
            ),
          );
          expect(tooDeeplyNestedQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(0)
              .setEndIndex(1)
              .setText('\u201C')
              .build(),
          });
          expect(tooDeeplyNestedQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(10)
              .setEndIndex(11)
              .setText('\u2018')
              .build(),
          });
          expect(tooDeeplyNestedQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(16)
              .setEndIndex(17)
              .setText('\u201C')
              .build(),
          });
          expect(tooDeeplyNestedQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
              .addDirection(PairedPunctuationDirection.Opening)
              .setStartIndex(27)
              .setEndIndex(28)
              .setText('\u2018')
              .build(),
          });
          expect(tooDeeplyNestedQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(43)
              .setEndIndex(44)
              .setText('\u2019')
              .build(),
          });
          expect(tooDeeplyNestedQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(44)
              .setEndIndex(45)
              .setText('\u201D')
              .build(),
          });
          expect(tooDeeplyNestedQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(45)
              .setEndIndex(46)
              .setText('\u2019')
              .build(),
          });
          expect(tooDeeplyNestedQuotationIterator.next()).toEqual({
            done: false,
            value: new UnresolvedQuoteMetadata.Builder()
              .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
              .addDirection(PairedPunctuationDirection.Closing)
              .setStartIndex(46)
              .setEndIndex(47)
              .setText('\u201D')
              .build(),
          });
          expect(tooDeeplyNestedQuotationIterator.next()).toEqual({ done: true, value: undefined });
        });
      });
    });
  });

  describe('ScriptureNode quotation mark identification', () => {
    it('identifies quotation marks in a single ScriptureNode', () => {
      const testEnv: TestEnvironment = TestEnvironment.createWithFullEnglishQuotes();
      const scriptureNode: ScriptureNode = testEnv.createScriptureNode('text \u201Cwith\u201D quotes', 1, 5, 1, 23);

      const quotationIterator: QuotationIterator = testEnv.newQuotationIterator(
        testEnv.createScriptureInput(scriptureNode),
      );
      expect(quotationIterator.next()).toEqual({
        done: false,
        value: new UnresolvedQuoteMetadata.Builder()
          .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
          .addDirection(PairedPunctuationDirection.Opening)
          .setStartIndex(5)
          .setEndIndex(6)
          .setEnclosingRange(scriptureNode.range)
          .setText('\u201C')
          .build(),
      });
      expect(quotationIterator.next()).toStrictEqual({
        done: false,
        value: new UnresolvedQuoteMetadata.Builder()
          .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
          .addDirection(PairedPunctuationDirection.Closing)
          .setStartIndex(10)
          .setEndIndex(11)
          .setEnclosingRange(scriptureNode.range)
          .setText('\u201D')
          .build(),
      });
      expect(quotationIterator.next()).toEqual({ done: true, value: undefined });
    });

    it('identifies quotation marks in multiple ScriptureNodes', () => {
      const testEnv: TestEnvironment = TestEnvironment.createWithFullEnglishQuotes();
      const scriptureNode1: ScriptureNode = testEnv.createScriptureNode('text \u201Cwith \u2018quotes', 1, 5, 1, 23);
      const scriptureNode2: ScriptureNode = testEnv.createScriptureNode('different\u2019 text\u201D', 2, 3, 2, 19);

      const quotationIterator: QuotationIterator = testEnv.newQuotationIterator(
        testEnv.createScriptureInput(scriptureNode1, scriptureNode2),
      );
      expect(quotationIterator.next()).toEqual({
        done: false,
        value: new UnresolvedQuoteMetadata.Builder()
          .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
          .addDirection(PairedPunctuationDirection.Opening)
          .setStartIndex(5)
          .setEndIndex(6)
          .setEnclosingRange(scriptureNode1.range)
          .setText('\u201C')
          .build(),
      });
      expect(quotationIterator.next()).toEqual({
        done: false,
        value: new UnresolvedQuoteMetadata.Builder()
          .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
          .addDirection(PairedPunctuationDirection.Opening)
          .setStartIndex(11)
          .setEndIndex(12)
          .setEnclosingRange(scriptureNode1.range)
          .setText('\u2018')
          .build(),
      });
      expect(quotationIterator.next()).toEqual({
        done: false,
        value: new UnresolvedQuoteMetadata.Builder()
          .addDepths([QuotationDepth.Secondary, QuotationDepth.fromNumber(4)])
          .addDirection(PairedPunctuationDirection.Closing)
          .setStartIndex(9)
          .setEndIndex(10)
          .setEnclosingRange(scriptureNode2.range)
          .setText('\u2019')
          .build(),
      });
      expect(quotationIterator.next()).toEqual({
        done: false,
        value: new UnresolvedQuoteMetadata.Builder()
          .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
          .addDirection(PairedPunctuationDirection.Closing)
          .setStartIndex(15)
          .setEndIndex(16)
          .setEnclosingRange(scriptureNode2.range)
          .setText('\u201D')
          .build(),
      });
      expect(quotationIterator.next()).toEqual({ done: true, value: undefined });
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
        .addDirection(PairedPunctuationDirection.Opening)
        .setText('\u201C');

      expect(() => equalIndicesBuilder.build()).toThrowError(
        /The endIndex \(5\) for an UnresolvedQuoteMetadata object must be greater than its startIndex \(5\)\./,
      );

      const negativeStartIndexBuilder = new UnresolvedQuoteMetadata.Builder()
        .setStartIndex(-1)
        .setEndIndex(5)
        .addDepth(QuotationDepth.Primary)
        .addDirection(PairedPunctuationDirection.Opening)
        .setText('\u201C');

      expect(() => negativeStartIndexBuilder.build()).toThrowError(
        /The startIndex for an UnresolvedQuoteMetadata object must be greater than or equal to 0\./,
      );

      const negativeEndIndexBuilder = new UnresolvedQuoteMetadata.Builder()
        .setStartIndex(5)
        .setEndIndex(-1)
        .addDepth(QuotationDepth.Primary)
        .addDirection(PairedPunctuationDirection.Opening)
        .setText('\u201C');

      expect(() => negativeEndIndexBuilder.build()).toThrowError(
        /The endIndex for an UnresolvedQuoteMetadata object must be greater than or equal to 0\./,
      );

      const noDepthsBuilder = new UnresolvedQuoteMetadata.Builder()
        .setStartIndex(4)
        .setEndIndex(5)
        .addDirection(PairedPunctuationDirection.Opening)
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
        .addDirection(PairedPunctuationDirection.Opening);

      expect(() => noTextBuilder.build()).toThrowError(/UnresolvedQuoteMetadata object has no text specified\./);
    });

    it('builds unambiguous objects correctly', () => {
      const unresolvedQuoteMetadata: UnresolvedQuoteMetadata = new UnresolvedQuoteMetadata.Builder()
        .addDepth(QuotationDepth.fromNumber(3))
        .addDirection(PairedPunctuationDirection.Opening)
        .setStartIndex(3)
        .setEndIndex(6)
        .setText('\u201C')
        .build();

      expect(unresolvedQuoteMetadata.isDirectionPossible(PairedPunctuationDirection.Opening)).toBe(true);
      expect(unresolvedQuoteMetadata.isDirectionPossible(PairedPunctuationDirection.Closing)).toBe(false);
      expect(unresolvedQuoteMetadata.isDepthPossible(QuotationDepth.Tertiary)).toBe(true);
      expect(unresolvedQuoteMetadata.isDepthPossible(QuotationDepth.fromNumber(3))).toBe(true);
      expect(unresolvedQuoteMetadata.isDepthPossible(QuotationDepth.Secondary)).toBe(false);
      expect(unresolvedQuoteMetadata.numPossibleDepths()).toEqual(1);
      expect(unresolvedQuoteMetadata.numPossibleDirections()).toEqual(1);
      expect(unresolvedQuoteMetadata.resolve(QuotationDepth.fromNumber(3), PairedPunctuationDirection.Opening)).toEqual(
        {
          depth: QuotationDepth.Tertiary,
          direction: PairedPunctuationDirection.Opening,
          startIndex: 3,
          endIndex: 6,
          text: '\u201C',
          isAutocorrectable: false,
        },
      );
    });

    it('builds ambiguous objects correctly', () => {
      const unresolvedQuoteMetadata: UnresolvedQuoteMetadata = new UnresolvedQuoteMetadata.Builder()
        .addDepth(QuotationDepth.fromNumber(3))
        .addDepth(QuotationDepth.fromNumber(1))
        .addDirection(PairedPunctuationDirection.Opening)
        .addDirection(PairedPunctuationDirection.Closing)
        .setStartIndex(3)
        .setEndIndex(6)
        .setText('"')
        .markAsAutocorrectable()
        .build();

      expect(unresolvedQuoteMetadata.isDirectionPossible(PairedPunctuationDirection.Opening)).toBe(true);
      expect(unresolvedQuoteMetadata.isDirectionPossible(PairedPunctuationDirection.Closing)).toBe(true);
      expect(unresolvedQuoteMetadata.isDirectionPossible(PairedPunctuationDirection.Ambiguous)).toBe(false);
      expect(unresolvedQuoteMetadata.isDepthPossible(QuotationDepth.Tertiary)).toBe(true);
      expect(unresolvedQuoteMetadata.isDepthPossible(QuotationDepth.fromNumber(3))).toBe(true);
      expect(unresolvedQuoteMetadata.isDepthPossible(QuotationDepth.fromNumber(1))).toBe(true);
      expect(unresolvedQuoteMetadata.isDepthPossible(QuotationDepth.Secondary)).toBe(false);
      expect(unresolvedQuoteMetadata.numPossibleDepths()).toEqual(2);
      expect(unresolvedQuoteMetadata.numPossibleDirections()).toEqual(2);
      expect(unresolvedQuoteMetadata.resolve(QuotationDepth.fromNumber(3), PairedPunctuationDirection.Opening)).toEqual(
        {
          depth: QuotationDepth.Tertiary,
          direction: PairedPunctuationDirection.Opening,
          startIndex: 3,
          endIndex: 6,
          text: '"',
          isAutocorrectable: true,
        },
      );

      // also test adding multiple depths and directions at once
      const groupAddUnresolvedQuoteMetadata: UnresolvedQuoteMetadata = new UnresolvedQuoteMetadata.Builder()
        .addDepths([QuotationDepth.fromNumber(3), QuotationDepth.fromNumber(1)])
        .addDirections([PairedPunctuationDirection.Opening, PairedPunctuationDirection.Closing])
        .setStartIndex(3)
        .setEndIndex(6)
        .setText('"')
        .markAsAutocorrectable()
        .build();

      expect(groupAddUnresolvedQuoteMetadata.isDirectionPossible(PairedPunctuationDirection.Opening)).toBe(true);
      expect(groupAddUnresolvedQuoteMetadata.isDirectionPossible(PairedPunctuationDirection.Closing)).toBe(true);
      expect(groupAddUnresolvedQuoteMetadata.isDirectionPossible(PairedPunctuationDirection.Ambiguous)).toBe(false);
      expect(groupAddUnresolvedQuoteMetadata.isDepthPossible(QuotationDepth.Tertiary)).toBe(true);
      expect(groupAddUnresolvedQuoteMetadata.isDepthPossible(QuotationDepth.fromNumber(3))).toBe(true);
      expect(groupAddUnresolvedQuoteMetadata.isDepthPossible(QuotationDepth.fromNumber(1))).toBe(true);
      expect(groupAddUnresolvedQuoteMetadata.isDepthPossible(QuotationDepth.Secondary)).toBe(false);
      expect(groupAddUnresolvedQuoteMetadata.numPossibleDepths()).toEqual(2);
      expect(groupAddUnresolvedQuoteMetadata.numPossibleDirections()).toEqual(2);
      expect(
        groupAddUnresolvedQuoteMetadata.resolve(QuotationDepth.fromNumber(3), PairedPunctuationDirection.Opening),
      ).toEqual({
        depth: QuotationDepth.Tertiary,
        direction: PairedPunctuationDirection.Opening,
        startIndex: 3,
        endIndex: 6,
        text: '"',
        isAutocorrectable: true,
      });
    });
  });

  it('gives the correct number of options for depth and direction', () => {
    const unresolvedQuoteMetadata: UnresolvedQuoteMetadata = new UnresolvedQuoteMetadata.Builder()
      .addDepth(QuotationDepth.fromNumber(3))
      .addDepth(QuotationDepth.fromNumber(1))
      .addDirection(PairedPunctuationDirection.Opening)
      .addDirection(PairedPunctuationDirection.Closing)
      .setStartIndex(3)
      .setEndIndex(6)
      .setText('"')
      .markAsAutocorrectable()
      .build();

    expect(unresolvedQuoteMetadata.numPossibleDepths()).toEqual(2);
    expect(unresolvedQuoteMetadata.numPossibleDirections()).toEqual(2);

    const evenMoreUnresolvedQuoteMetadata: UnresolvedQuoteMetadata = new UnresolvedQuoteMetadata.Builder()
      .addDepth(QuotationDepth.fromNumber(3))
      .addDepth(QuotationDepth.fromNumber(1))
      .addDepth(QuotationDepth.fromNumber(2))
      .addDirection(PairedPunctuationDirection.Opening)
      .addDirection(PairedPunctuationDirection.Closing)
      .setStartIndex(3)
      .setEndIndex(6)
      .setText('"')
      .build();

    expect(evenMoreUnresolvedQuoteMetadata.numPossibleDepths()).toEqual(3);
    expect(evenMoreUnresolvedQuoteMetadata.numPossibleDirections()).toEqual(2);
  });

  it('tells whether the given depth/direction is possible', () => {
    const unresolvedQuoteMetadata: UnresolvedQuoteMetadata = new UnresolvedQuoteMetadata.Builder()
      .addDepth(QuotationDepth.fromNumber(3))
      .addDepth(QuotationDepth.fromNumber(1))
      .addDirection(PairedPunctuationDirection.Opening)
      .addDirection(PairedPunctuationDirection.Closing)
      .setStartIndex(3)
      .setEndIndex(6)
      .setText('"')
      .markAsAutocorrectable()
      .build();

    expect(unresolvedQuoteMetadata.isDepthPossible(QuotationDepth.Primary)).toBe(true);
    expect(unresolvedQuoteMetadata.isDepthPossible(QuotationDepth.Secondary)).toBe(false);
    expect(unresolvedQuoteMetadata.isDepthPossible(QuotationDepth.Tertiary)).toBe(true);
    expect(unresolvedQuoteMetadata.isDepthPossible(QuotationDepth.fromNumber(4))).toBe(false);
    expect(unresolvedQuoteMetadata.isDirectionPossible(PairedPunctuationDirection.Opening)).toBe(true);
    expect(unresolvedQuoteMetadata.isDirectionPossible(PairedPunctuationDirection.Closing)).toBe(true);
    expect(unresolvedQuoteMetadata.isDirectionPossible(PairedPunctuationDirection.Ambiguous)).toBe(false);
  });

  it('resolves into a QuoteMetadata object with the choices specified', () => {
    const unresolvedQuoteMetadata: UnresolvedQuoteMetadata = new UnresolvedQuoteMetadata.Builder()
      .addDepth(QuotationDepth.fromNumber(3))
      .addDepth(QuotationDepth.fromNumber(1))
      .addDirection(PairedPunctuationDirection.Opening)
      .addDirection(PairedPunctuationDirection.Closing)
      .setStartIndex(3)
      .setEndIndex(6)
      .setText('"')
      .markAsAutocorrectable()
      .build();

    expect(unresolvedQuoteMetadata.resolve(QuotationDepth.fromNumber(1), PairedPunctuationDirection.Opening)).toEqual({
      depth: QuotationDepth.Primary,
      direction: PairedPunctuationDirection.Opening,
      startIndex: 3,
      endIndex: 6,
      text: '"',
      isAutocorrectable: true,
    });
    expect(unresolvedQuoteMetadata.resolve(QuotationDepth.fromNumber(3), PairedPunctuationDirection.Opening)).toEqual({
      depth: QuotationDepth.Tertiary,
      direction: PairedPunctuationDirection.Opening,
      startIndex: 3,
      endIndex: 6,
      text: '"',
      isAutocorrectable: true,
    });
    expect(unresolvedQuoteMetadata.resolve(QuotationDepth.fromNumber(1), PairedPunctuationDirection.Closing)).toEqual({
      depth: QuotationDepth.Primary,
      direction: PairedPunctuationDirection.Closing,
      startIndex: 3,
      endIndex: 6,
      text: '"',
      isAutocorrectable: true,
    });
    expect(unresolvedQuoteMetadata.resolve(QuotationDepth.fromNumber(3), PairedPunctuationDirection.Closing)).toEqual({
      depth: QuotationDepth.Tertiary,
      direction: PairedPunctuationDirection.Closing,
      startIndex: 3,
      endIndex: 6,
      text: '"',
      isAutocorrectable: true,
    });
  });

  it('selects the best depth when given a scoring function', () => {
    const unresolvedQuoteMetadata: UnresolvedQuoteMetadata = new UnresolvedQuoteMetadata.Builder()
      .addDepth(QuotationDepth.fromNumber(3))
      .addDepth(QuotationDepth.fromNumber(1))
      .addDirection(PairedPunctuationDirection.Opening)
      .addDirection(PairedPunctuationDirection.Closing)
      .setStartIndex(3)
      .setEndIndex(6)
      .setText('"')
      .markAsAutocorrectable()
      .build();

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
    const unresolvedQuoteMetadata: UnresolvedQuoteMetadata = new UnresolvedQuoteMetadata.Builder()
      .addDepth(QuotationDepth.fromNumber(3))
      .addDepth(QuotationDepth.fromNumber(1))
      .addDirection(PairedPunctuationDirection.Opening)
      .addDirection(PairedPunctuationDirection.Closing)
      .setStartIndex(3)
      .setEndIndex(6)
      .setText('"')
      .markAsAutocorrectable()
      .build();

    expect(
      unresolvedQuoteMetadata.findBestDirection((direction: PairedPunctuationDirection) =>
        direction === PairedPunctuationDirection.Opening ? 1 : 0,
      ),
    ).toEqual(PairedPunctuationDirection.Opening);
    expect(
      unresolvedQuoteMetadata.findBestDirection((direction: PairedPunctuationDirection) =>
        direction === PairedPunctuationDirection.Opening ? -55 : -50,
      ),
    ).toEqual(PairedPunctuationDirection.Closing);
    // In the case of a tie, the earliest inserted direction should win
    expect(unresolvedQuoteMetadata.findBestDirection((_direction: PairedPunctuationDirection) => 0)).toEqual(
      PairedPunctuationDirection.Opening,
    );
  });

  it('errors when it cannot be resolved as called', () => {
    const unresolvedQuoteMetadata: UnresolvedQuoteMetadata = new UnresolvedQuoteMetadata.Builder()
      .addDepth(QuotationDepth.fromNumber(3))
      .addDepth(QuotationDepth.fromNumber(1))
      .addDirection(PairedPunctuationDirection.Opening)
      .addDirection(PairedPunctuationDirection.Closing)
      .setStartIndex(3)
      .setEndIndex(6)
      .setText('"')
      .markAsAutocorrectable()
      .build();

    expect(() =>
      unresolvedQuoteMetadata.resolve(QuotationDepth.fromNumber(2), PairedPunctuationDirection.Opening),
    ).toThrowError('Cannot resolve quote metadata with depth 2, as this depth is not possible.');
    expect(() =>
      unresolvedQuoteMetadata.resolve(QuotationDepth.fromNumber(3), PairedPunctuationDirection.Ambiguous),
    ).toThrow('Cannot resolve quote metadata with direction \u201CAmbiguous\u201D as this direction is not possible');
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

class TestEnvironment {
  private constructor(private readonly quotationConfig: QuotationConfig) {}

  public newQuotationIterator(checkableGroup: CheckableGroup): QuotationIterator {
    return new QuotationIterator(this.quotationConfig, checkableGroup);
  }

  static createWithTopLevelQuotesAndNoAmbiguity(): TestEnvironment {
    return new TestEnvironment(
      new QuotationConfig.Builder()
        .setTopLevelQuotationMarks({
          openingPunctuationMark: '\u201C',
          closingPunctuationMark: '\u201D',
        })
        .build(),
    );
  }

  static createWithTopLevelQuotes(): TestEnvironment {
    return new TestEnvironment(
      new QuotationConfig.Builder()
        .setTopLevelQuotationMarks({
          openingPunctuationMark: '\u201C',
          closingPunctuationMark: '\u201D',
        })
        .mapAmbiguousQuotationMark('"', '\u201C')
        .mapAmbiguousQuotationMark('"', '\u201D')
        .build(),
    );
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
        .build(),
    );
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

  createTextInput(text: string): CheckableGroup {
    return new CheckableGroup([new TextDocumentCheckable(text)]);
  }

  createScriptureInput(...scriptureNodes: ScriptureNode[]): CheckableGroup {
    return new CheckableGroup(scriptureNodes.map((x) => new ScriptureNodeCheckable(x)));
  }
}
