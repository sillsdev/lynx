import { describe, expect, it } from 'vitest';

import { PairedPunctuationConfig } from '../../src/paired-punctuation/paired-punctuation-config';

describe('PairedPunctuationConfig tests', () => {
  const pairedPunctuationConfig: PairedPunctuationConfig = new PairedPunctuationConfig.Builder()
    .addQuotationRule({
      openingPunctuationMark: '\u201C',
      closingPunctuationMark: '\u201D',
    })
    .addQuotationRule({
      openingPunctuationMark: '\u2018',
      closingPunctuationMark: '\u2019',
    })
    .addRule({
      openingPunctuationMark: '(',
      closingPunctuationMark: ')',
    })
    .addRule({
      openingPunctuationMark: '[',
      closingPunctuationMark: ']',
    })
    .addRule({
      openingPunctuationMark: '{',
      closingPunctuationMark: '}',
    })
    .build();

  it('identifies opening and closing marks correctly', () => {
    expect(pairedPunctuationConfig.isOpeningMark('(')).toBe(true);
    expect(pairedPunctuationConfig.isOpeningMark(')')).toBe(false);
    expect(pairedPunctuationConfig.isClosingMark('(')).toBe(false);
    expect(pairedPunctuationConfig.isClosingMark(')')).toBe(true);

    expect(pairedPunctuationConfig.isOpeningMark('[')).toBe(true);
    expect(pairedPunctuationConfig.isOpeningMark(']')).toBe(false);
    expect(pairedPunctuationConfig.isClosingMark('[')).toBe(false);
    expect(pairedPunctuationConfig.isClosingMark(']')).toBe(true);

    expect(pairedPunctuationConfig.isOpeningMark('{')).toBe(true);
    expect(pairedPunctuationConfig.isOpeningMark('}')).toBe(false);
    expect(pairedPunctuationConfig.isClosingMark('{')).toBe(false);
    expect(pairedPunctuationConfig.isClosingMark('}')).toBe(true);

    expect(pairedPunctuationConfig.isOpeningMark('\u201C')).toBe(true);
    expect(pairedPunctuationConfig.isOpeningMark('\u201D')).toBe(false);
    expect(pairedPunctuationConfig.isClosingMark('\u201C')).toBe(false);
    expect(pairedPunctuationConfig.isClosingMark('\u201D')).toBe(true);

    expect(pairedPunctuationConfig.isOpeningMark('\u2018')).toBe(true);
    expect(pairedPunctuationConfig.isOpeningMark('\u2019')).toBe(false);
    expect(pairedPunctuationConfig.isClosingMark('\u2018')).toBe(false);
    expect(pairedPunctuationConfig.isClosingMark('\u2019')).toBe(true);

    expect(pairedPunctuationConfig.isOpeningMark('`')).toBe(false);
    expect(pairedPunctuationConfig.isClosingMark('`')).toBe(false);
    expect(pairedPunctuationConfig.isOpeningMark('<')).toBe(false);
    expect(pairedPunctuationConfig.isOpeningMark('>')).toBe(false);
    expect(pairedPunctuationConfig.isOpeningMark('a')).toBe(false);
    expect(pairedPunctuationConfig.isClosingMark('a')).toBe(false);
  });

  it('checks whether two punctuation marks constitute a pair', () => {
    expect(pairedPunctuationConfig.doMarksConstituteAPair('(', ')')).toBe(true);
    expect(pairedPunctuationConfig.doMarksConstituteAPair(')', '(')).toBe(true);
    expect(pairedPunctuationConfig.doMarksConstituteAPair('(', ']')).toBe(false);
    expect(pairedPunctuationConfig.doMarksConstituteAPair('[', ')')).toBe(false);
    expect(pairedPunctuationConfig.doMarksConstituteAPair('(', '(')).toBe(false);
    expect(pairedPunctuationConfig.doMarksConstituteAPair(')', ')')).toBe(false);
    expect(pairedPunctuationConfig.doMarksConstituteAPair('[', ']')).toBe(true);
    expect(pairedPunctuationConfig.doMarksConstituteAPair(']', '[')).toBe(true);
    expect(pairedPunctuationConfig.doMarksConstituteAPair('{', '}')).toBe(true);
    expect(pairedPunctuationConfig.doMarksConstituteAPair('}', '{')).toBe(true);

    expect(pairedPunctuationConfig.doMarksConstituteAPair('\u201C', '\u201D')).toBe(true);
    expect(pairedPunctuationConfig.doMarksConstituteAPair('\u201D', '\u201C')).toBe(true);
    expect(pairedPunctuationConfig.doMarksConstituteAPair('\u201C', '\u2018')).toBe(false);
    expect(pairedPunctuationConfig.doMarksConstituteAPair('\u201C', '\u2019')).toBe(false);
    expect(pairedPunctuationConfig.doMarksConstituteAPair('\u2018', '\u201C')).toBe(false);
    expect(pairedPunctuationConfig.doMarksConstituteAPair('\u2019', '\u201C')).toBe(false);
    expect(pairedPunctuationConfig.doMarksConstituteAPair('\u201C', '\u2018')).toBe(false);
    expect(pairedPunctuationConfig.doMarksConstituteAPair('\u201D', '\u2018')).toBe(false);
    expect(pairedPunctuationConfig.doMarksConstituteAPair('\u201D', '\u2019')).toBe(false);
    expect(pairedPunctuationConfig.doMarksConstituteAPair('\u201C', '\u201C')).toBe(false);
    expect(pairedPunctuationConfig.doMarksConstituteAPair('\u201D', '\u201D')).toBe(false);
    expect(pairedPunctuationConfig.doMarksConstituteAPair('\u2018', '\u2019')).toBe(true);
    expect(pairedPunctuationConfig.doMarksConstituteAPair('\u2019', '\u2018')).toBe(true);
    expect(pairedPunctuationConfig.doMarksConstituteAPair('\u2018', '\u2018')).toBe(false);
    expect(pairedPunctuationConfig.doMarksConstituteAPair('\u2019', '\u2019')).toBe(false);

    expect(pairedPunctuationConfig.doMarksConstituteAPair('\u201C', ')')).toBe(false);
    expect(pairedPunctuationConfig.doMarksConstituteAPair('\u201D', '(')).toBe(false);
    expect(pairedPunctuationConfig.doMarksConstituteAPair('\u2018', ']')).toBe(false);
    expect(pairedPunctuationConfig.doMarksConstituteAPair('\u2019', '[')).toBe(false);
    expect(pairedPunctuationConfig.doMarksConstituteAPair('\u201C', '}')).toBe(false);
    expect(pairedPunctuationConfig.doMarksConstituteAPair('\u201C', '{')).toBe(false);

    expect(pairedPunctuationConfig.doMarksConstituteAPair('<', '>')).toBe(false);
    expect(pairedPunctuationConfig.doMarksConstituteAPair('>', '<')).toBe(false);
    expect(pairedPunctuationConfig.doMarksConstituteAPair('\u2018', '`')).toBe(false);
    expect(pairedPunctuationConfig.doMarksConstituteAPair('(', 'a')).toBe(false);
  });

  it('finds the corresponding mark to the one provided', () => {
    expect(pairedPunctuationConfig.findCorrespondingMark('(')).toEqual(')');
    expect(pairedPunctuationConfig.findCorrespondingMark(')')).toEqual('(');
    expect(pairedPunctuationConfig.findCorrespondingMark('[')).toEqual(']');
    expect(pairedPunctuationConfig.findCorrespondingMark(']')).toEqual('[');
    expect(pairedPunctuationConfig.findCorrespondingMark('{')).toEqual('}');
    expect(pairedPunctuationConfig.findCorrespondingMark('}')).toEqual('{');
    expect(pairedPunctuationConfig.findCorrespondingMark('\u201C')).toEqual('\u201D');
    expect(pairedPunctuationConfig.findCorrespondingMark('\u201D')).toEqual('\u201C');
    expect(pairedPunctuationConfig.findCorrespondingMark('\u2018')).toEqual('\u2019');
    expect(pairedPunctuationConfig.findCorrespondingMark('\u2019')).toEqual('\u2018');

    expect(pairedPunctuationConfig.findCorrespondingMark('`')).toBe(undefined);
    expect(pairedPunctuationConfig.findCorrespondingMark('a')).toBe(undefined);
    expect(pairedPunctuationConfig.findCorrespondingMark('<')).toBe(undefined);
    expect(pairedPunctuationConfig.findCorrespondingMark('>')).toBe(undefined);
  });

  it('flags unmatched quotation marks as undeserving of errors (since they are covered by the quotation checker)', () => {
    expect(pairedPunctuationConfig.shouldErrorForUnmatchedMarks('\u201C')).toBe(false);
    expect(pairedPunctuationConfig.shouldErrorForUnmatchedMarks('\u201D')).toBe(false);
    expect(pairedPunctuationConfig.shouldErrorForUnmatchedMarks('\u2018')).toBe(false);
    expect(pairedPunctuationConfig.shouldErrorForUnmatchedMarks('\u2019')).toBe(false);
    expect(pairedPunctuationConfig.shouldErrorForUnmatchedMarks('\u201E')).toBe(true);
    expect(pairedPunctuationConfig.shouldErrorForUnmatchedMarks('\u201F')).toBe(true);
    expect(pairedPunctuationConfig.shouldErrorForUnmatchedMarks('(')).toBe(true);
    expect(pairedPunctuationConfig.shouldErrorForUnmatchedMarks('(')).toBe(true);
    expect(pairedPunctuationConfig.shouldErrorForUnmatchedMarks('[')).toBe(true);
    expect(pairedPunctuationConfig.shouldErrorForUnmatchedMarks(']')).toBe(true);
    expect(pairedPunctuationConfig.shouldErrorForUnmatchedMarks('{')).toBe(true);
    expect(pairedPunctuationConfig.shouldErrorForUnmatchedMarks('}')).toBe(true);
    expect(pairedPunctuationConfig.shouldErrorForUnmatchedMarks('`')).toBe(true);
    expect(pairedPunctuationConfig.shouldErrorForUnmatchedMarks('<')).toBe(true);
    expect(pairedPunctuationConfig.shouldErrorForUnmatchedMarks('>')).toBe(true);
  });

  it('creates a regex of the paired marks', () => {
    expect(pairedPunctuationConfig.createAllPairedMarksRegex()).toEqual(/[()[\]{}“”‘’]/gu);

    const differentOrderPairedPunctuationConfig: PairedPunctuationConfig = new PairedPunctuationConfig.Builder()
      .addRule({
        openingPunctuationMark: '{',
        closingPunctuationMark: '}',
      })
      .addRule({
        openingPunctuationMark: '[',
        closingPunctuationMark: ']',
      })
      .addRule({
        openingPunctuationMark: '(',
        closingPunctuationMark: ')',
      })
      .addQuotationRule({
        openingPunctuationMark: '\u2018',
        closingPunctuationMark: '\u2019',
      })
      .addQuotationRule({
        openingPunctuationMark: '\u201C',
        closingPunctuationMark: '\u201D',
      })
      .build();

    expect(differentOrderPairedPunctuationConfig.createAllPairedMarksRegex()).toEqual(/[{}[\]()‘’“”]/gu);
  });
});
