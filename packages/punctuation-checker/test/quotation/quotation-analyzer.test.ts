import { describe, expect, it } from 'vitest';

import { _privateTestingClasses, QuotationAnalysis, QuotationAnalyzer } from '../../src/quotation/quotation-analyzer';
import { QuotationConfig } from '../../src/quotation/quotation-config';
import {
  QuotationDepth,
  QuotationRootLevel,
  QuoteMetadata,
  UnresolvedQuoteMetadata,
} from '../../src/quotation/quotation-utils';
import { PairedPunctuationDirection } from '../../src/utils';

describe('QuotationAnalyzer tests', () => {
  describe('Miscellaneous tests', () => {
    it("doesn't store any state between runs", () => {
      const testEnv: TestEnvironment = TestEnvironment.createWithTopLevelEnglishQuotes();

      const danglingQuotationAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
        '\u201CSample \u2018text\u2019',
      );
      expect(danglingQuotationAnalysis.getUnmatchedQuotes()).toEqual([
        {
          depth: QuotationDepth.Primary,
          direction: PairedPunctuationDirection.Opening,
          startIndex: 0,
          endIndex: 1,
          text: '\u201C',
          isAutocorrectable: false,
        },
      ]);

      const emptyQuotationAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze('Sample \u2018text\u2019');
      expect(emptyQuotationAnalysis.getUnmatchedQuotes()).toEqual([]);
    });
  });

  describe('Issue identification tests', () => {
    describe('Top-level English quotation marks', () => {
      describe('No issues for well-formed text', () => {
        it('produces no issues for quote-less text', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithTopLevelEnglishQuotes();

          const emptyStringAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze('');
          expect(emptyStringAnalysis.getUnmatchedQuotes()).toEqual([]);
          expect(emptyStringAnalysis.getIncorrectlyNestedQuotes()).toEqual([]);

          const noQuotationAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze('Sample text');
          expect(noQuotationAnalysis.getUnmatchedQuotes()).toEqual([]);
          expect(noQuotationAnalysis.getIncorrectlyNestedQuotes()).toEqual([]);
        });

        it('produces no issues for well-formed quote pairs', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithTopLevelEnglishQuotes();

          const singleQuotationPairAnalysis: QuotationAnalysis =
            testEnv.quotationAnalyzer.analyze('\u201CSample text\u201D');
          expect(singleQuotationPairAnalysis.getUnmatchedQuotes()).toEqual([]);
          expect(singleQuotationPairAnalysis.getIncorrectlyNestedQuotes()).toEqual([]);

          const multipleQuotationPairAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '\u201CSample text\u201D with \u201Cmore sample text\u201D',
          );
          expect(multipleQuotationPairAnalysis.getUnmatchedQuotes()).toEqual([]);
          expect(multipleQuotationPairAnalysis.getIncorrectlyNestedQuotes()).toEqual([]);
        });

        it('produces no issues when ambiguous quotation marks are well-formed', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithTopLevelEnglishQuotes();

          const pairOfAmbiguousQuotePairAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze('""');
          expect(pairOfAmbiguousQuotePairAnalysis.getUnmatchedQuotes()).toEqual([]);
          expect(pairOfAmbiguousQuotePairAnalysis.getIncorrectlyNestedQuotes()).toEqual([]);

          const midStringAmbiguousQuotePairAnalysis: QuotationAnalysis =
            testEnv.quotationAnalyzer.analyze('Sample "text"');
          expect(midStringAmbiguousQuotePairAnalysis.getUnmatchedQuotes()).toEqual([]);
          expect(midStringAmbiguousQuotePairAnalysis.getIncorrectlyNestedQuotes()).toEqual([]);

          const mismatchedQuotationPairAnalysis: QuotationAnalysis =
            testEnv.quotationAnalyzer.analyze('\u201CSample text"');
          expect(mismatchedQuotationPairAnalysis.getUnmatchedQuotes()).toEqual([]);
          expect(mismatchedQuotationPairAnalysis.getIncorrectlyNestedQuotes()).toEqual([]);

          const multipleQuotationPairAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '"Sample text\u201D using \u201Cmixed "quotation" marks\u201D',
          );
          expect(multipleQuotationPairAnalysis.getUnmatchedQuotes()).toEqual([]);
          expect(multipleQuotationPairAnalysis.getIncorrectlyNestedQuotes()).toEqual([]);
        });
      });

      describe('Incorrectly paired quotation marks', () => {
        it('identifies unpaired open quotes', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithTopLevelEnglishQuotes();

          const isolatedQuoteAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze('\u201C');
          expect(isolatedQuoteAnalysis.getUnmatchedQuotes()).toEqual([
            {
              depth: QuotationDepth.Primary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 0,
              endIndex: 1,
              text: '\u201C',
              isAutocorrectable: false,
            },
          ]);

          const singleOpeningQuoteAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            'Sample text with \u201CMore sample text',
          );
          expect(singleOpeningQuoteAnalysis.getUnmatchedQuotes()).toEqual([
            {
              depth: QuotationDepth.Primary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 17,
              endIndex: 18,
              text: '\u201C',
              isAutocorrectable: false,
            },
          ]);

          const multipleQuotesAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '\u201CSample text\u201D with \u201CMore sample text',
          );
          expect(multipleQuotesAnalysis.getUnmatchedQuotes()).toEqual([
            {
              depth: QuotationDepth.Primary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 19,
              endIndex: 20,
              text: '\u201C',
              isAutocorrectable: false,
            },
          ]);

          const multipleNestedQuotesAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '\u201CSample text with \u201CMore sample text\u201D',
          );
          expect(multipleNestedQuotesAnalysis.getUnmatchedQuotes()).toEqual([
            {
              depth: QuotationDepth.Primary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 0,
              endIndex: 1,
              text: '\u201C',
              isAutocorrectable: false,
            },
          ]);
        });

        it('identifies unpaired closing quotes', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithTopLevelEnglishQuotes();

          const isolatedQuoteAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze('\u201D');
          expect(isolatedQuoteAnalysis.getUnmatchedQuotes()).toEqual([
            {
              depth: QuotationDepth.Primary,
              direction: PairedPunctuationDirection.Closing,
              startIndex: 0,
              endIndex: 1,
              text: '\u201D',
              isAutocorrectable: false,
            },
          ]);

          const singleClosingQuoteAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            'Sample text with\u201D more sample text',
          );
          expect(singleClosingQuoteAnalysis.getUnmatchedQuotes()).toEqual([
            {
              depth: QuotationDepth.Primary,
              direction: PairedPunctuationDirection.Closing,
              startIndex: 16,
              endIndex: 17,
              text: '\u201D',
              isAutocorrectable: false,
            },
          ]);

          const multipleQuotesAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            'Sample text with\u201D \u201Cmore sample text\u201D',
          );
          expect(multipleQuotesAnalysis.getUnmatchedQuotes()).toEqual([
            {
              depth: QuotationDepth.Primary,
              direction: PairedPunctuationDirection.Closing,
              startIndex: 16,
              endIndex: 17,
              text: '\u201D',
              isAutocorrectable: false,
            },
          ]);

          const multipleNestedQuotesAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '\u201CSample text with\u201D more sample text\u201D',
          );
          expect(multipleNestedQuotesAnalysis.getUnmatchedQuotes()).toEqual([
            {
              depth: QuotationDepth.Primary,
              direction: PairedPunctuationDirection.Closing,
              startIndex: 35,
              endIndex: 36,
              text: '\u201D',
              isAutocorrectable: false,
            },
          ]);
        });
      });

      describe('Incorectly nested quotation marks', () => {
        it('identifies an opening primary quote in the middle of a primary quote', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithTopLevelEnglishQuotes();

          const multipleNestedQuotesAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '\u201CSample text with\u201C more sample text\u201D',
          );
          expect(multipleNestedQuotesAnalysis.getIncorrectlyNestedQuotes()).toEqual([
            {
              depth: QuotationDepth.Primary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 17,
              endIndex: 18,
              text: '\u201C',
              isAutocorrectable: false,
              parentDepth: QuotationDepth.Primary,
            },
          ]);
        });
      });
    });

    describe('Multi-level English quotation mark tests', () => {
      describe('No issues for well-formed text', () => {
        it('produces no issues for well-formed quote pairs', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithFullEnglishQuotes();

          const twoNestedQuotationPairsAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '\u201CSample text with \u2018another nested quote.\u2019\u201D',
          );
          expect(twoNestedQuotationPairsAnalysis.getUnmatchedQuotes()).toEqual([]);
          expect(twoNestedQuotationPairsAnalysis.getIncorrectlyNestedQuotes()).toEqual([]);

          const multipleQuotationPairAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '\u201CSample \u2018nested quote\u2019\u201D with \u201Canother quote\u201D',
          );
          expect(multipleQuotationPairAnalysis.getUnmatchedQuotes()).toEqual([]);
          expect(multipleQuotationPairAnalysis.getIncorrectlyNestedQuotes()).toEqual([]);

          const multipleNestedQuotationPairAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '\u201CSample \u2018nested quote\u2019\u201D with \u201C\u2018another\u2019 nested quote.\u201D',
          );
          expect(multipleNestedQuotationPairAnalysis.getUnmatchedQuotes()).toEqual([]);
          expect(multipleNestedQuotationPairAnalysis.getIncorrectlyNestedQuotes()).toEqual([]);

          const threeLevelNestedQuotationPairAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '\u201CSample \u2018nested quote with yet another \u201Cnested quote\u201D\u2019\u201D',
          );
          expect(threeLevelNestedQuotationPairAnalysis.getUnmatchedQuotes()).toEqual([]);
          expect(threeLevelNestedQuotationPairAnalysis.getIncorrectlyNestedQuotes()).toEqual([]);
        });

        it('produces no issues when ambiguous quotation marks are well-formed', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithFullEnglishQuotes();

          const nestedAmbiguousQuoteAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '"A quote \'within a quote.\'"',
          );
          expect(nestedAmbiguousQuoteAnalysis.getUnmatchedQuotes()).toEqual([]);
          expect(nestedAmbiguousQuoteAnalysis.getIncorrectlyNestedQuotes()).toEqual([]);

          const threeLevelNestedAmbiguousQuoteAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '"A quote \'within a quote and "a third."\'"',
          );
          expect(threeLevelNestedAmbiguousQuoteAnalysis.getUnmatchedQuotes()).toEqual([]);
          expect(threeLevelNestedAmbiguousQuoteAnalysis.getIncorrectlyNestedQuotes()).toEqual([]);

          const firstLevelAmbiguousNestedQuoteAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '"The first level \u2018of quotes\u2019" is ambiguous.',
          );
          expect(firstLevelAmbiguousNestedQuoteAnalysis.getUnmatchedQuotes()).toEqual([]);
          expect(firstLevelAmbiguousNestedQuoteAnalysis.getIncorrectlyNestedQuotes()).toEqual([]);

          const secondLevelAmbiguousNestedQuoteAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            "\u201CThe second level 'of quotes' is ambiguous.\u201D",
          );
          expect(secondLevelAmbiguousNestedQuoteAnalysis.getUnmatchedQuotes()).toEqual([]);
          expect(secondLevelAmbiguousNestedQuoteAnalysis.getIncorrectlyNestedQuotes()).toEqual([]);

          const thirdLevelAmbiguousNestedQuoteAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '\u201CThe third \u2018level "of quotes" is ambiguous.\u2019\u201D',
          );
          expect(thirdLevelAmbiguousNestedQuoteAnalysis.getUnmatchedQuotes()).toEqual([]);
          expect(thirdLevelAmbiguousNestedQuoteAnalysis.getIncorrectlyNestedQuotes()).toEqual([]);
        });
      });

      describe('Incorrectly paired quotation marks', () => {
        it('identifies unpaired open quotes', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithFullEnglishQuotes();

          const unclosedPrimaryQuoteAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '\u201CThis has a \u2018nested quote\u2019',
          );
          expect(unclosedPrimaryQuoteAnalysis.getUnmatchedQuotes()).toEqual([
            {
              depth: QuotationDepth.Primary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 0,
              endIndex: 1,
              text: '\u201C',
              isAutocorrectable: false,
            },
          ]);

          const unclosedSecondaryQuoteAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '\u201CThis has an \u2018unclosed nested quote\u201D',
          );
          expect(unclosedSecondaryQuoteAnalysis.getUnmatchedQuotes()).toEqual([
            {
              depth: QuotationDepth.Secondary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 13,
              endIndex: 14,
              text: '\u2018',
              isAutocorrectable: false,
            },
          ]);

          const unclosedTertiaryQuoteAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '\u201CThis has \u2018an \u201Cunclosed thrid-level\u2019 quote\u201D',
          );
          expect(unclosedTertiaryQuoteAnalysis.getUnmatchedQuotes()).toEqual([
            {
              depth: QuotationDepth.Tertiary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 14,
              endIndex: 15,
              text: '\u201C',
              isAutocorrectable: false,
            },
          ]);

          const multipleUnclosedQuoteAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '\u201CThis has two \u2018unclosed quotes',
          );
          expect(multipleUnclosedQuoteAnalysis.getUnmatchedQuotes()).toEqual([
            {
              depth: QuotationDepth.Primary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 0,
              endIndex: 1,
              text: '\u201C',
              isAutocorrectable: false,
            },
            {
              depth: QuotationDepth.Secondary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 14,
              endIndex: 15,
              text: '\u2018',
              isAutocorrectable: false,
            },
          ]);

          const multipleUnclosedQuoteAnalysis2: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '\u201CThis has two \u2018unclosed \u201Cquotes\u201D',
          );
          expect(multipleUnclosedQuoteAnalysis2.getUnmatchedQuotes()).toEqual([
            {
              depth: QuotationDepth.Primary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 0,
              endIndex: 1,
              text: '\u201C',
              isAutocorrectable: false,
            },
            {
              depth: QuotationDepth.Secondary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 14,
              endIndex: 15,
              text: '\u2018',
              isAutocorrectable: false,
            },
          ]);

          const ambiguousUnclosedQuoteAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '"This has an \u2018ambiguous\u2019 unclosed quote',
          );
          expect(ambiguousUnclosedQuoteAnalysis.getUnmatchedQuotes()).toEqual([
            {
              depth: QuotationDepth.Primary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 0,
              endIndex: 1,
              text: '"',
              isAutocorrectable: true,
            },
          ]);

          const ambiguousUnclosedQuoteAnalysis2: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            "\u201CThis has an 'ambiguous unclosed quote\u201D",
          );
          expect(ambiguousUnclosedQuoteAnalysis2.getUnmatchedQuotes()).toEqual([
            {
              depth: QuotationDepth.Secondary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 13,
              endIndex: 14,
              text: "'",
              isAutocorrectable: true,
            },
          ]);
        });

        it('identifies unpaired open quotes when the first- and third-level quotes are distinct', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithDifferentFirstAndThirdLevelQuotes();

          const unpairedThirdAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '\u201CThis text has a \u2018primary \u201Equote\u201D closing inside a tertiary quote',
          );
          expect(unpairedThirdAnalysis.getUnmatchedQuotes()).toEqual([
            {
              depth: QuotationDepth.Tertiary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 26,
              endIndex: 27,
              text: '\u201E',
              isAutocorrectable: false,
            },
            {
              depth: QuotationDepth.Secondary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 17,
              endIndex: 18,
              text: '\u2018',
              isAutocorrectable: false,
            },
          ]);

          const unpairedThirdInSecondAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '\u201CThis text has a \u2018primary \u201Equote\u2019 closing inside a tertiary quote\u201D',
          );
          expect(unpairedThirdInSecondAnalysis.getUnmatchedQuotes()).toEqual([
            {
              depth: QuotationDepth.Tertiary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 26,
              endIndex: 27,
              text: '\u201E',
              isAutocorrectable: false,
            },
          ]);
        });

        it('identifies unpaired closing quotes', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithFullEnglishQuotes();

          const unpairedPrimaryQuoteAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            'Text with an \u2018unpaired\u2019 closing quote\u201D',
          );
          expect(unpairedPrimaryQuoteAnalysis.getUnmatchedQuotes()).toEqual([
            {
              depth: QuotationDepth.Primary,
              direction: PairedPunctuationDirection.Closing,
              startIndex: 37,
              endIndex: 38,
              text: '\u201D',
              isAutocorrectable: false,
            },
          ]);

          const unpairedSecondaryQuoteAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '\u201CText with an unpaired\u2019 closing quote\u201D',
          );
          expect(unpairedSecondaryQuoteAnalysis.getUnmatchedQuotes()).toEqual([
            {
              depth: QuotationDepth.Secondary,
              direction: PairedPunctuationDirection.Closing,
              startIndex: 22,
              endIndex: 23,
              text: '\u2019',
              isAutocorrectable: false,
            },
          ]);

          const multipleUnpairedQuoteAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            'This text has multiple\u2019 unpaired quotes\u201D',
          );
          expect(multipleUnpairedQuoteAnalysis.getUnmatchedQuotes()).toEqual([
            {
              depth: QuotationDepth.Secondary,
              direction: PairedPunctuationDirection.Closing,
              startIndex: 22,
              endIndex: 23,
              text: '\u2019',
              isAutocorrectable: false,
            },
            {
              depth: QuotationDepth.Primary,
              direction: PairedPunctuationDirection.Closing,
              startIndex: 39,
              endIndex: 40,
              text: '\u201D',
              isAutocorrectable: false,
            },
          ]);

          const multipleUnpairedQuoteAnalysis2: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '\u201CThis text has multiple\u201D unpaired\u2019 quotes\u201D',
          );
          expect(multipleUnpairedQuoteAnalysis2.getUnmatchedQuotes()).toEqual([
            {
              depth: QuotationDepth.Secondary,
              direction: PairedPunctuationDirection.Closing,
              startIndex: 33,
              endIndex: 34,
              text: '\u2019',
              isAutocorrectable: false,
            },
            {
              depth: QuotationDepth.Primary,
              direction: PairedPunctuationDirection.Closing,
              startIndex: 41,
              endIndex: 42,
              text: '\u201D',
              isAutocorrectable: false,
            },
          ]);

          const ambiguousUnpairedQuoteAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '\u201CThis text has an ambiguous\u201D unpaired" quote',
          );
          expect(ambiguousUnpairedQuoteAnalysis.getUnmatchedQuotes()).toEqual([
            {
              depth: QuotationDepth.Primary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 37,
              endIndex: 38,
              text: '"',
              isAutocorrectable: true,
            },
          ]);

          const ambiguousUnpairedQuoteAnalysis2: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            "\u201CThis text has an ambiguous\u201D unpaired' quote",
          );
          expect(ambiguousUnpairedQuoteAnalysis2.getUnmatchedQuotes()).toEqual([
            {
              depth: QuotationDepth.Secondary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 37,
              endIndex: 38,
              text: "'",
              isAutocorrectable: true,
              parentDepth: new QuotationRootLevel(),
            },
          ]);
        });

        it('identifies unpaired closing quotes whne the first- and third-level quotes are distinct', () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithDifferentFirstAndThirdLevelQuotes();

          const unpairedTertiaryQuoteAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '\u201CText \u2018with an unpaired\u201F\u2019 closing quote\u201D',
          );
          expect(unpairedTertiaryQuoteAnalysis.getUnmatchedQuotes()).toEqual([
            {
              depth: QuotationDepth.Tertiary,
              direction: PairedPunctuationDirection.Closing,
              startIndex: 23,
              endIndex: 24,
              text: '\u201F',
              isAutocorrectable: false,
            },
          ]);

          const secondInFirstAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '\u201CThis text has a\u2019 secondary quote closing inside a primary quote\u201D',
          );
          expect(secondInFirstAnalysis.getUnmatchedQuotes()).toEqual([
            {
              depth: QuotationDepth.Secondary,
              direction: PairedPunctuationDirection.Closing,
              startIndex: 16,
              endIndex: 17,
              text: '\u2019',
              isAutocorrectable: false,
            },
          ]);

          const thirdInSecondAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '\u201CThis text has a\u2018 tertiary quote\u201F closing inside a secondary quote\u2019\u201D',
          );
          expect(thirdInSecondAnalysis.getUnmatchedQuotes()).toEqual([
            {
              depth: QuotationDepth.Tertiary,
              direction: PairedPunctuationDirection.Closing,
              startIndex: 32,
              endIndex: 33,
              text: '\u201F',
              isAutocorrectable: false,
            },
          ]);

          const thirdInFirstAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '\u201CThis text has a tertiary quote\u201F closing inside a primary quote\u201D',
          );
          expect(thirdInFirstAnalysis.getUnmatchedQuotes()).toEqual([
            {
              depth: QuotationDepth.Tertiary,
              direction: PairedPunctuationDirection.Closing,
              startIndex: 31,
              endIndex: 32,
              text: '\u201F',
              isAutocorrectable: false,
            },
          ]);
        });
      });

      describe('Incorectly nested quotation marks', () => {
        it("identifies opening quotes that don't match the context", () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithFullEnglishQuotes();

          // primary opening quote in the midst of a primary quote was already tested above

          const secondInSecondAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '\u201CThis text has a \u2018secondary quote \u2018opening inside a secondary quote',
          );
          expect(secondInSecondAnalysis.getIncorrectlyNestedQuotes()).toEqual([
            {
              depth: QuotationDepth.Secondary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 34,
              endIndex: 35,
              text: '\u2018',
              isAutocorrectable: false,
              parentDepth: QuotationDepth.Secondary,
            },
          ]);

          const secondInSecondAnalysis2: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '\u201CThis text has a \u2018secondary quote \u2018opening inside a secondary quote\u2019\u2019\u201D',
          );
          expect(secondInSecondAnalysis2.getIncorrectlyNestedQuotes()).toEqual([
            {
              depth: QuotationDepth.Secondary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 34,
              endIndex: 35,
              text: '\u2018',
              isAutocorrectable: false,
              parentDepth: QuotationDepth.Secondary,
            },
          ]);

          const thirdInThirdAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '\u201CThis text has a \u2018tertiary quote \u201Copening \u201Cinside a tertiary quote',
          );
          expect(thirdInThirdAnalysis.getIncorrectlyNestedQuotes()).toEqual([
            {
              depth: QuotationDepth.Tertiary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 42,
              endIndex: 43,
              text: '\u201C',
              isAutocorrectable: false,
              parentDepth: QuotationDepth.Tertiary,
            },
          ]);

          const secondInSecondAmbiguousAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            "\u201CThis text has a 'secondary quote \u2018opening inside a secondary quote",
          );
          expect(secondInSecondAmbiguousAnalysis.getIncorrectlyNestedQuotes()).toEqual([
            {
              depth: QuotationDepth.Secondary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 34,
              endIndex: 35,
              text: '\u2018',
              isAutocorrectable: false,
              parentDepth: QuotationDepth.Secondary,
            },
          ]);
        });

        it("identifies opening quotes that don't match the context when the first- and third-level quotes are distinct", () => {
          const testEnv: TestEnvironment = TestEnvironment.createWithDifferentFirstAndThirdLevelQuotes();

          const tertiaryInPrimaryAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
            '\u201CThis text has a \u201Etertiary quote opening in a primary context',
          );
          expect(tertiaryInPrimaryAnalysis.getIncorrectlyNestedQuotes()).toEqual([
            {
              depth: QuotationDepth.Tertiary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 17,
              endIndex: 18,
              text: '\u201E',
              isAutocorrectable: false,
              parentDepth: QuotationDepth.Primary,
            },
          ]);
        });
      });

      describe('Quotes that are nested too deeply', () => {
        it('warns only for quotes that are deeper than the nesting warning depth', () => {
          const allQuotesAreTooDeepTestEnv: TestEnvironment =
            TestEnvironment.createWithFullEnglishQuotesAndWarningDepth(QuotationDepth.Primary);

          expect(
            allQuotesAreTooDeepTestEnv.quotationAnalyzer
              .analyze('\u201CFirst level quotes only\u201D')
              .getTooDeeplyNestedQuotes(),
          ).toEqual([
            {
              depth: QuotationDepth.Primary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 0,
              endIndex: 1,
              text: '\u201C',
              isAutocorrectable: false,
            },
            {
              depth: QuotationDepth.Primary,
              direction: PairedPunctuationDirection.Closing,
              startIndex: 24,
              endIndex: 25,
              text: '\u201D',
              isAutocorrectable: false,
            },
          ]);

          expect(
            allQuotesAreTooDeepTestEnv.quotationAnalyzer
              .analyze('\u201CFirst and \u2018second level\u2019 quotes\u201D')
              .getTooDeeplyNestedQuotes(),
          ).toEqual([
            {
              depth: QuotationDepth.Primary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 0,
              endIndex: 1,
              text: '\u201C',
              isAutocorrectable: false,
            },
            {
              depth: QuotationDepth.Secondary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 11,
              endIndex: 12,
              text: '\u2018',
              isAutocorrectable: false,
            },
            {
              depth: QuotationDepth.Secondary,
              direction: PairedPunctuationDirection.Closing,
              startIndex: 24,
              endIndex: 25,
              text: '\u2019',
              isAutocorrectable: false,
            },
            {
              depth: QuotationDepth.Primary,
              direction: PairedPunctuationDirection.Closing,
              startIndex: 32,
              endIndex: 33,
              text: '\u201D',
              isAutocorrectable: false,
            },
          ]);

          const secondLevelIsTooDeepTestEnv: TestEnvironment =
            TestEnvironment.createWithFullEnglishQuotesAndWarningDepth(QuotationDepth.Secondary);

          expect(
            secondLevelIsTooDeepTestEnv.quotationAnalyzer
              .analyze('\u201CFirst level quotes only\u201D')
              .getTooDeeplyNestedQuotes(),
          ).toEqual([]);

          expect(
            secondLevelIsTooDeepTestEnv.quotationAnalyzer
              .analyze('\u201CFirst and \u2018second level\u2019 quotes\u201D')
              .getTooDeeplyNestedQuotes(),
          ).toEqual([
            {
              depth: QuotationDepth.Secondary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 11,
              endIndex: 12,
              text: '\u2018',
              isAutocorrectable: false,
            },
            {
              depth: QuotationDepth.Secondary,
              direction: PairedPunctuationDirection.Closing,
              startIndex: 24,
              endIndex: 25,
              text: '\u2019',
              isAutocorrectable: false,
            },
          ]);

          expect(
            secondLevelIsTooDeepTestEnv.quotationAnalyzer
              .analyze('\u201CFirst, \u2018second, and \u201Cthird\u201D level\u2019 quotes\u201D')
              .getTooDeeplyNestedQuotes(),
          ).toEqual([
            {
              depth: QuotationDepth.Secondary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 8,
              endIndex: 9,
              text: '\u2018',
              isAutocorrectable: false,
            },
            {
              depth: QuotationDepth.Tertiary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 21,
              endIndex: 22,
              text: '\u201C',
              isAutocorrectable: false,
            },
            {
              depth: QuotationDepth.Tertiary,
              direction: PairedPunctuationDirection.Closing,
              startIndex: 27,
              endIndex: 28,
              text: '\u201D',
              isAutocorrectable: false,
            },
            {
              depth: QuotationDepth.Secondary,
              direction: PairedPunctuationDirection.Closing,
              startIndex: 34,
              endIndex: 35,
              text: '\u2019',
              isAutocorrectable: false,
            },
          ]);

          const thirdLevelIsTooDeepTestEnv: TestEnvironment =
            TestEnvironment.createWithFullEnglishQuotesAndWarningDepth(QuotationDepth.Tertiary);

          expect(
            thirdLevelIsTooDeepTestEnv.quotationAnalyzer
              .analyze('\u201CFirst level quotes only\u201D')
              .getTooDeeplyNestedQuotes(),
          ).toEqual([]);

          expect(
            thirdLevelIsTooDeepTestEnv.quotationAnalyzer
              .analyze('\u201CFirst and \u2018second level\u2019 quotes\u201D')
              .getTooDeeplyNestedQuotes(),
          ).toEqual([]);

          expect(
            thirdLevelIsTooDeepTestEnv.quotationAnalyzer
              .analyze('\u201CFirst, \u2018second, and \u201Cthird\u201D level\u2019 quotes\u201D')
              .getTooDeeplyNestedQuotes(),
          ).toEqual([
            {
              depth: QuotationDepth.Tertiary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 21,
              endIndex: 22,
              text: '\u201C',
              isAutocorrectable: false,
            },
            {
              depth: QuotationDepth.Tertiary,
              direction: PairedPunctuationDirection.Closing,
              startIndex: 27,
              endIndex: 28,
              text: '\u201D',
              isAutocorrectable: false,
            },
          ]);

          expect(
            thirdLevelIsTooDeepTestEnv.quotationAnalyzer
              .analyze('\u201CFirst, \u2018second, \u201Cthird, and \u2018fourth\u2019\u201D level\u2019 quotes\u201D')
              .getTooDeeplyNestedQuotes(),
          ).toEqual([
            {
              depth: QuotationDepth.Tertiary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 17,
              endIndex: 18,
              text: '\u201C',
              isAutocorrectable: false,
            },
            {
              depth: QuotationDepth.fromNumber(4),
              direction: PairedPunctuationDirection.Opening,
              startIndex: 29,
              endIndex: 30,
              text: '\u2018',
              isAutocorrectable: false,
            },
            {
              depth: QuotationDepth.fromNumber(4),
              direction: PairedPunctuationDirection.Closing,
              startIndex: 36,
              endIndex: 37,
              text: '\u2019',
              isAutocorrectable: false,
            },
            {
              depth: QuotationDepth.Tertiary,
              direction: PairedPunctuationDirection.Closing,
              startIndex: 37,
              endIndex: 38,
              text: '\u201D',
              isAutocorrectable: false,
            },
          ]);

          const fourthLevelIsTooDeepTestEnv: TestEnvironment =
            TestEnvironment.createWithFullEnglishQuotesAndWarningDepth(QuotationDepth.fromNumber(4));

          expect(
            fourthLevelIsTooDeepTestEnv.quotationAnalyzer
              .analyze('\u201CFirst level quotes only\u201D')
              .getTooDeeplyNestedQuotes(),
          ).toEqual([]);

          expect(
            fourthLevelIsTooDeepTestEnv.quotationAnalyzer
              .analyze('\u201CFirst and \u2018second level\u2019 quotes\u201D')
              .getTooDeeplyNestedQuotes(),
          ).toEqual([]);

          expect(
            fourthLevelIsTooDeepTestEnv.quotationAnalyzer
              .analyze('\u201CFirst, \u2018second, and \u201Cthird\u201D level\u2019 quotes\u201D')
              .getTooDeeplyNestedQuotes(),
          ).toEqual([]);

          expect(
            fourthLevelIsTooDeepTestEnv.quotationAnalyzer
              .analyze('\u201CFirst, \u2018second, \u201Cthird, and \u2018fourth\u2019\u201D level\u2019 quotes\u201D')
              .getTooDeeplyNestedQuotes(),
          ).toEqual([
            {
              depth: QuotationDepth.fromNumber(4),
              direction: PairedPunctuationDirection.Opening,
              startIndex: 29,
              endIndex: 30,
              text: '\u2018',
              isAutocorrectable: false,
            },
            {
              depth: QuotationDepth.fromNumber(4),
              direction: PairedPunctuationDirection.Closing,
              startIndex: 36,
              endIndex: 37,
              text: '\u2019',
              isAutocorrectable: false,
            },
          ]);
        });

        it('warns for ambiguous quotes that are deeper than the nesting warning depth', () => {
          const thirdLevelIsTooDeepTestEnv: TestEnvironment =
            TestEnvironment.createWithFullEnglishQuotesAndWarningDepth(QuotationDepth.Tertiary);

          expect(
            thirdLevelIsTooDeepTestEnv.quotationAnalyzer
              .analyze('"First level quotes only"')
              .getTooDeeplyNestedQuotes(),
          ).toEqual([]);

          expect(
            thirdLevelIsTooDeepTestEnv.quotationAnalyzer
              .analyze('"First and \'second level\' quotes"')
              .getTooDeeplyNestedQuotes(),
          ).toEqual([]);

          expect(
            thirdLevelIsTooDeepTestEnv.quotationAnalyzer
              .analyze('"First, \'second, and "third" level\' quotes"')
              .getTooDeeplyNestedQuotes(),
          ).toEqual([
            {
              depth: QuotationDepth.Tertiary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 21,
              endIndex: 22,
              text: '"',
              isAutocorrectable: true,
            },
            {
              depth: QuotationDepth.Tertiary,
              direction: PairedPunctuationDirection.Closing,
              startIndex: 27,
              endIndex: 28,
              text: '"',
              isAutocorrectable: true,
            },
          ]);

          expect(
            thirdLevelIsTooDeepTestEnv.quotationAnalyzer
              .analyze('"First, \'second, "third, and \'fourth\'" level\' quotes"')
              .getTooDeeplyNestedQuotes(),
          ).toEqual([
            {
              depth: QuotationDepth.Tertiary,
              direction: PairedPunctuationDirection.Opening,
              startIndex: 17,
              endIndex: 18,
              text: '"',
              isAutocorrectable: true,
            },
            {
              depth: QuotationDepth.fromNumber(4),
              direction: PairedPunctuationDirection.Opening,
              startIndex: 29,
              endIndex: 30,
              text: "'",
              isAutocorrectable: true,
            },
            {
              depth: QuotationDepth.fromNumber(4),
              direction: PairedPunctuationDirection.Closing,
              startIndex: 36,
              endIndex: 37,
              text: "'",
              isAutocorrectable: true,
            },
            {
              depth: QuotationDepth.Tertiary,
              direction: PairedPunctuationDirection.Closing,
              startIndex: 37,
              endIndex: 38,
              text: '"',
              isAutocorrectable: true,
            },
          ]);

          const fourthLevelIsTooDeepTestEnv: TestEnvironment =
            TestEnvironment.createWithFullEnglishQuotesAndWarningDepth(QuotationDepth.fromNumber(4));

          expect(
            fourthLevelIsTooDeepTestEnv.quotationAnalyzer
              .analyze('"First level quotes only"')
              .getTooDeeplyNestedQuotes(),
          ).toEqual([]);

          expect(
            fourthLevelIsTooDeepTestEnv.quotationAnalyzer
              .analyze('"First and \'second level\' quotes"')
              .getTooDeeplyNestedQuotes(),
          ).toEqual([]);

          expect(
            fourthLevelIsTooDeepTestEnv.quotationAnalyzer
              .analyze('"First, \'second, and "third" level\' quotes"')
              .getTooDeeplyNestedQuotes(),
          ).toEqual([]);

          expect(
            fourthLevelIsTooDeepTestEnv.quotationAnalyzer
              .analyze('"First, \'second, "third, and \'fourth\'" level\' quotes"')
              .getTooDeeplyNestedQuotes(),
          ).toEqual([
            {
              depth: QuotationDepth.fromNumber(4),
              direction: PairedPunctuationDirection.Opening,
              startIndex: 29,
              endIndex: 30,
              text: "'",
              isAutocorrectable: true,
            },
            {
              depth: QuotationDepth.fromNumber(4),
              direction: PairedPunctuationDirection.Closing,
              startIndex: 36,
              endIndex: 37,
              text: "'",
              isAutocorrectable: true,
            },
          ]);
        });
      });
    });
  });

  describe('Ambiguous quote correction tests', () => {
    it('produces no output for unambiguous quotation marks', () => {
      const testEnv: TestEnvironment = TestEnvironment.createWithFullEnglishQuotes();

      const unambiguousQuoteAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
        'Sample \u201Ctext with no \u2018ambiguous\u2019 quotation\u201D marks.',
      );
      expect(unambiguousQuoteAnalysis.getAmbiguousQuoteCorrections()).toEqual([]);
    });

    it('replaces ambiguous quotation marks with the corresponding unambiguous versions', () => {
      const testEnv: TestEnvironment = TestEnvironment.createWithFullEnglishQuotes();

      const simpleQuoteAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze('"');
      expect(simpleQuoteAnalysis.getAmbiguousQuoteCorrections()).toEqual([
        {
          existingQuotationMark: {
            depth: QuotationDepth.Primary,
            direction: PairedPunctuationDirection.Opening,
            startIndex: 0,
            endIndex: 1,
            text: '"',
            isAutocorrectable: true,
          },
          correctedQuotationMark: {
            depth: QuotationDepth.Primary,
            direction: PairedPunctuationDirection.Opening,
            startIndex: 0,
            endIndex: 1,
            text: '\u201C',
            isAutocorrectable: true,
          },
        },
      ]);

      const multipleNestedQuotesAnalysis: QuotationAnalysis = testEnv.quotationAnalyzer.analyze(
        '"Sample text with \u2018ambiguous marks\'',
      );

      expect(multipleNestedQuotesAnalysis.getAmbiguousQuoteCorrections()).toEqual([
        {
          existingQuotationMark: {
            depth: QuotationDepth.Primary,
            direction: PairedPunctuationDirection.Opening,
            startIndex: 0,
            endIndex: 1,
            text: '"',
            isAutocorrectable: true,
          },
          correctedQuotationMark: {
            depth: QuotationDepth.Primary,
            direction: PairedPunctuationDirection.Opening,
            startIndex: 0,
            endIndex: 1,
            text: '\u201C',
            isAutocorrectable: true,
          },
        },
        {
          existingQuotationMark: {
            depth: QuotationDepth.Secondary,
            direction: PairedPunctuationDirection.Closing,
            startIndex: 34,
            endIndex: 35,
            text: "'",
            isAutocorrectable: true,
          },
          correctedQuotationMark: {
            depth: QuotationDepth.Secondary,
            direction: PairedPunctuationDirection.Closing,
            startIndex: 34,
            endIndex: 35,
            text: '\u2019',
            isAutocorrectable: true,
          },
        },
      ]);
    });
  });
});

describe('QuotationResolver tests', () => {
  it('trivially resolves quotes with only one option for depth and direction', () => {
    const quotationResolver = new _privateTestingClasses.QuotationResolver(null);

    expect(
      quotationResolver.resolve(
        new UnresolvedQuoteMetadata.Builder()
          .addDepth(QuotationDepth.Primary)
          .addDirection(PairedPunctuationDirection.Opening)
          .setStartIndex(5)
          .setEndIndex(6)
          .setText('\u201C')
          .build(),
      ),
    ).toEqual({
      depth: QuotationDepth.Primary,
      direction: PairedPunctuationDirection.Opening,
      startIndex: 5,
      endIndex: 6,
      text: '\u201C',
      isAutocorrectable: false,
    });
  });

  it('resolves top-level English quotes when the quote stack is empty', () => {
    const quotationResolver = new _privateTestingClasses.QuotationResolver(null);

    expect(
      quotationResolver.resolve(
        new UnresolvedQuoteMetadata.Builder()
          .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
          .addDirections([PairedPunctuationDirection.Opening, PairedPunctuationDirection.Closing])
          .setStartIndex(0)
          .setEndIndex(1)
          .setText('"')
          .markAsAutocorrectable()
          .build(),
      ),
    ).toEqual({
      depth: QuotationDepth.Primary,
      direction: PairedPunctuationDirection.Opening,
      startIndex: 0,
      endIndex: 1,
      text: '"',
      isAutocorrectable: true,
    });
  });

  it('resolves ambiguous English-style quotes based on the deepest quote in the quote stack', () => {
    const deepestQuotePrimaryOpening: QuoteMetadata = {
      depth: QuotationDepth.Primary,
      direction: PairedPunctuationDirection.Opening,
      startIndex: 0,
      endIndex: 1,
      text: '\u201C',
      isAutocorrectable: false,
    };
    let quotationResolver = new _privateTestingClasses.QuotationResolver(deepestQuotePrimaryOpening);

    expect(
      quotationResolver.resolve(
        new UnresolvedQuoteMetadata.Builder()
          .addDepths([QuotationDepth.fromNumber(2), QuotationDepth.fromNumber(4)])
          .addDirections([PairedPunctuationDirection.Opening, PairedPunctuationDirection.Closing])
          .setStartIndex(5)
          .setEndIndex(6)
          .setText("'")
          .markAsAutocorrectable()
          .build(),
      ),
    ).toEqual({
      depth: QuotationDepth.fromNumber(2),
      direction: PairedPunctuationDirection.Opening,
      startIndex: 5,
      endIndex: 6,
      text: "'",
      isAutocorrectable: true,
    });

    expect(
      quotationResolver.resolve(
        new UnresolvedQuoteMetadata.Builder()
          .addDepths([QuotationDepth.fromNumber(1), QuotationDepth.fromNumber(3)])
          .addDirections([PairedPunctuationDirection.Opening, PairedPunctuationDirection.Closing])
          .setStartIndex(5)
          .setEndIndex(6)
          .setText('"')
          .markAsAutocorrectable()
          .build(),
      ),
    ).toEqual({
      depth: QuotationDepth.fromNumber(1),
      direction: PairedPunctuationDirection.Closing,
      startIndex: 5,
      endIndex: 6,
      text: '"',
      isAutocorrectable: true,
    });

    const deepestQuoteSecondaryOpening: QuoteMetadata = {
      depth: QuotationDepth.Secondary,
      direction: PairedPunctuationDirection.Opening,
      startIndex: 0,
      endIndex: 1,
      text: '\u201C',
      isAutocorrectable: false,
    };
    quotationResolver = new _privateTestingClasses.QuotationResolver(deepestQuoteSecondaryOpening);

    expect(
      quotationResolver.resolve(
        new UnresolvedQuoteMetadata.Builder()
          .addDepths([QuotationDepth.fromNumber(2), QuotationDepth.fromNumber(4)])
          .addDirections([PairedPunctuationDirection.Opening, PairedPunctuationDirection.Closing])
          .setStartIndex(5)
          .setEndIndex(6)
          .setText("'")
          .markAsAutocorrectable()
          .build(),
      ),
    ).toEqual({
      depth: QuotationDepth.fromNumber(2),
      direction: PairedPunctuationDirection.Closing,
      startIndex: 5,
      endIndex: 6,
      text: "'",
      isAutocorrectable: true,
    });

    expect(
      quotationResolver.resolve(
        new UnresolvedQuoteMetadata.Builder()
          .addDepths([QuotationDepth.fromNumber(1), QuotationDepth.fromNumber(3)])
          .addDirections([PairedPunctuationDirection.Opening, PairedPunctuationDirection.Closing])
          .setStartIndex(5)
          .setEndIndex(6)
          .setText('"')
          .markAsAutocorrectable()
          .build(),
      ),
    ).toEqual({
      depth: QuotationDepth.fromNumber(3),
      direction: PairedPunctuationDirection.Opening,
      startIndex: 5,
      endIndex: 6,
      text: '"',
      isAutocorrectable: true,
    });

    quotationResolver = new _privateTestingClasses.QuotationResolver({
      depth: QuotationDepth.Tertiary,
      direction: PairedPunctuationDirection.Opening,
      startIndex: 3,
      endIndex: 4,
      text: '\u201C',
      isAutocorrectable: false,
    });

    expect(
      quotationResolver.resolve(
        new UnresolvedQuoteMetadata.Builder()
          .addDepths([QuotationDepth.fromNumber(1), QuotationDepth.fromNumber(3)])
          .addDirections([PairedPunctuationDirection.Opening, PairedPunctuationDirection.Closing])
          .setStartIndex(5)
          .setEndIndex(6)
          .setText("'")
          .markAsAutocorrectable()
          .build(),
      ),
    ).toEqual({
      depth: QuotationDepth.fromNumber(3),
      direction: PairedPunctuationDirection.Closing,
      startIndex: 5,
      endIndex: 6,
      text: "'",
      isAutocorrectable: true,
    });
  });

  it('resolves ambiguous Swedish-style quotes', () => {
    let quotationResolver = new _privateTestingClasses.QuotationResolver(null);

    expect(
      quotationResolver.resolve(
        new UnresolvedQuoteMetadata.Builder()
          .addDepth(QuotationDepth.Primary)
          .addDirections([PairedPunctuationDirection.Opening, PairedPunctuationDirection.Closing])
          .setStartIndex(0)
          .setEndIndex(1)
          .setText('\u201D')
          .build(),
      ),
    ).toEqual({
      depth: QuotationDepth.Primary,
      direction: PairedPunctuationDirection.Opening,
      startIndex: 0,
      endIndex: 1,
      text: '\u201D',
      isAutocorrectable: false,
    });

    const deepestQuotePrimaryOpening: QuoteMetadata = {
      depth: QuotationDepth.Primary,
      direction: PairedPunctuationDirection.Opening,
      startIndex: 0,
      endIndex: 1,
      text: '\u201D',
      isAutocorrectable: false,
    };
    quotationResolver = new _privateTestingClasses.QuotationResolver(deepestQuotePrimaryOpening);

    expect(
      quotationResolver.resolve(
        new UnresolvedQuoteMetadata.Builder()
          .addDepth(QuotationDepth.fromNumber(1))
          .addDirections([PairedPunctuationDirection.Opening, PairedPunctuationDirection.Closing])
          .setStartIndex(5)
          .setEndIndex(6)
          .setText('\u201D')
          .build(),
      ),
    ).toEqual({
      depth: QuotationDepth.fromNumber(1),
      direction: PairedPunctuationDirection.Closing,
      startIndex: 5,
      endIndex: 6,
      text: '\u201D',
      isAutocorrectable: false,
    });

    expect(
      quotationResolver.resolve(
        new UnresolvedQuoteMetadata.Builder()
          .addDepths([QuotationDepth.fromNumber(2), QuotationDepth.fromNumber(3)])
          .addDirections([PairedPunctuationDirection.Opening, PairedPunctuationDirection.Closing])
          .setStartIndex(5)
          .setEndIndex(6)
          .setText('\u2019')
          .build(),
      ),
    ).toEqual({
      depth: QuotationDepth.fromNumber(2),
      direction: PairedPunctuationDirection.Opening,
      startIndex: 5,
      endIndex: 6,
      text: '\u2019',
      isAutocorrectable: false,
    });

    const deepestQuoteSecondaryOpening: QuoteMetadata = {
      depth: QuotationDepth.Secondary,
      direction: PairedPunctuationDirection.Opening,
      startIndex: 10,
      endIndex: 11,
      text: '\u2019',
      isAutocorrectable: false,
    };
    quotationResolver = new _privateTestingClasses.QuotationResolver(deepestQuoteSecondaryOpening);

    // When it could either be a 2nd-level closing or 3rd-level opening,
    // we default to choosing the closing quote
    expect(
      quotationResolver.resolve(
        new UnresolvedQuoteMetadata.Builder()
          .addDepths([QuotationDepth.fromNumber(2), QuotationDepth.fromNumber(3)])
          .addDirections([PairedPunctuationDirection.Opening, PairedPunctuationDirection.Closing])
          .setStartIndex(15)
          .setEndIndex(16)
          .setText('\u2019')
          .build(),
      ),
    ).toEqual({
      depth: QuotationDepth.fromNumber(2),
      direction: PairedPunctuationDirection.Closing,
      startIndex: 15,
      endIndex: 16,
      text: '\u2019',
      isAutocorrectable: false,
    });
  });

  it('makes reasonable guesses for incorrectly-used quotation marks', () => {
    // “example of ‘this case”<--
    const closingDoubleInSingleResolver = new _privateTestingClasses.QuotationResolver({
      depth: QuotationDepth.Secondary,
      direction: PairedPunctuationDirection.Opening,
      startIndex: 5,
      endIndex: 6,
      text: '\u2018',
      isAutocorrectable: false,
    });
    expect(
      closingDoubleInSingleResolver.resolve(
        new UnresolvedQuoteMetadata.Builder()
          .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
          .addDirection(PairedPunctuationDirection.Closing)
          .setStartIndex(10)
          .setEndIndex(11)
          .setText('\u201D')
          .build(),
      ),
    ).toEqual({
      depth: QuotationDepth.fromNumber(1),
      direction: PairedPunctuationDirection.Closing,
      startIndex: 10,
      endIndex: 11,
      text: '\u201D',
      isAutocorrectable: false,
    });

    // “example of this case“<--
    const doubleOpeningInDoubleResolver = new _privateTestingClasses.QuotationResolver({
      depth: QuotationDepth.Primary,
      direction: PairedPunctuationDirection.Opening,
      startIndex: 0,
      endIndex: 1,
      text: '\u201C',
      isAutocorrectable: false,
    });
    expect(
      doubleOpeningInDoubleResolver.resolve(
        new UnresolvedQuoteMetadata.Builder()
          .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
          .addDirection(PairedPunctuationDirection.Opening)
          .setStartIndex(10)
          .setEndIndex(11)
          .setText('\u201C')
          .build(),
      ),
    ).toEqual({
      depth: QuotationDepth.fromNumber(3),
      direction: PairedPunctuationDirection.Opening,
      startIndex: 10,
      endIndex: 11,
      text: '\u201C',
      isAutocorrectable: false,
    });

    // example of this case”<--
    const doubleClosingResolver = new _privateTestingClasses.QuotationResolver(null);
    expect(
      doubleClosingResolver.resolve(
        new UnresolvedQuoteMetadata.Builder()
          .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
          .addDirection(PairedPunctuationDirection.Closing)
          .setStartIndex(10)
          .setEndIndex(11)
          .setText('\u201D')
          .build(),
      ),
    ).toEqual({
      depth: QuotationDepth.fromNumber(1),
      direction: PairedPunctuationDirection.Closing,
      startIndex: 10,
      endIndex: 11,
      text: '\u201D',
      isAutocorrectable: false,
    });

    // “example ‘of “this case“<--
    const doubleOpeningInThirdLevelResolver = new _privateTestingClasses.QuotationResolver({
      depth: QuotationDepth.Tertiary,
      direction: PairedPunctuationDirection.Opening,
      startIndex: 10,
      endIndex: 11,
      text: '\u201C',
      isAutocorrectable: false,
    });
    expect(
      doubleOpeningInThirdLevelResolver.resolve(
        new UnresolvedQuoteMetadata.Builder()
          .addDepths([QuotationDepth.Primary, QuotationDepth.Tertiary])
          .addDirection(PairedPunctuationDirection.Opening)
          .setStartIndex(15)
          .setEndIndex(16)
          .setText('\u201C')
          .build(),
      ),
    ).toEqual({
      depth: QuotationDepth.fromNumber(3),
      direction: PairedPunctuationDirection.Opening,
      startIndex: 15,
      endIndex: 16,
      text: '\u201C',
      isAutocorrectable: false,
    });
  });
});

class TestEnvironment {
  readonly quotationAnalyzer: QuotationAnalyzer;

  private constructor(private readonly quotationConfig: QuotationConfig) {
    this.quotationAnalyzer = new QuotationAnalyzer(this.quotationConfig);
  }

  static createWithTopLevelEnglishQuotes(): TestEnvironment {
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
        .mapAmbiguousQuotationMark('"', '\u201C')
        .mapAmbiguousQuotationMark('"', '\u201D')
        .mapAmbiguousQuotationMark("'", '\u2018')
        .mapAmbiguousQuotationMark("'", '\u2019')
        .build(),
    );
  }

  static createWithDifferentFirstAndThirdLevelQuotes(): TestEnvironment {
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
          openingPunctuationMark: '\u201E',
          closingPunctuationMark: '\u201F',
        })
        .build(),
    );
  }

  static createWithFullEnglishQuotesAndWarningDepth(warningDepth: QuotationDepth): TestEnvironment {
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
        .setNestingWarningDepth(warningDepth)
        .build(),
    );
  }
}
