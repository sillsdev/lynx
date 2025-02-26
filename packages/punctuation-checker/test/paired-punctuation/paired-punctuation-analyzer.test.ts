import { ScriptureNode, ScriptureText } from '@sillsdev/lynx';
import { describe, expect, it } from 'vitest';

import { CheckableGroup, ScriptureNodeCheckable, TextDocumentCheckable } from '../../src/checkable';
import { OverlappingPairs, PairedPunctuationAnalyzer } from '../../src/paired-punctuation/paired-punctuation-analyzer';
import { PairedPunctuationConfig } from '../../src/paired-punctuation/paired-punctuation-config';
import { _privateTestingClasses } from '../../src/quotation/quotation-analyzer';
import { PairedPunctuationDirection } from '../../src/utils';

describe('Text tests', () => {
  it('identifies no issues with well-formed text', () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();

    const emptyAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(testEnv.createTextInput(''));
    expect(emptyAnalysis.getOverlappingPunctuationMarks()).toEqual([]);
    expect(emptyAnalysis.getUnmatchedPunctuationMarks()).toEqual([]);

    const quotesAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(
      testEnv.createTextInput('\u201CThe rain in \u2018Spain \u201Cfalls\u201D mainly\u2019 on the plain.\u201D'),
    );
    expect(quotesAnalysis.getOverlappingPunctuationMarks()).toEqual([]);
    expect(quotesAnalysis.getUnmatchedPunctuationMarks()).toEqual([]);

    const multiplePairsAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(
      testEnv.createTextInput('(The rain) in [Spain] falls {mainly} (on the plain).'),
    );
    expect(multiplePairsAnalysis.getOverlappingPunctuationMarks()).toEqual([]);
    expect(multiplePairsAnalysis.getUnmatchedPunctuationMarks()).toEqual([]);

    const multipleNestedPairsAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(
      testEnv.createTextInput('(The rain in [Spain {falls} mainly] on the plain).'),
    );
    expect(multipleNestedPairsAnalysis.getOverlappingPunctuationMarks()).toEqual([]);
    expect(multipleNestedPairsAnalysis.getUnmatchedPunctuationMarks()).toEqual([]);

    const quotesAndOtherPairsAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(
      testEnv.createTextInput('\u201CThe rain in (Spain \u2018falls [mainly]\u2019 on the plain).\u201D'),
    );
    expect(quotesAndOtherPairsAnalysis.getOverlappingPunctuationMarks()).toEqual([]);
    expect(quotesAndOtherPairsAnalysis.getUnmatchedPunctuationMarks()).toEqual([]);
  });

  it('identifies unmatched punctuation pairs', () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();

    const openingParenAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(testEnv.createTextInput('('));
    expect(openingParenAnalysis.getUnmatchedPunctuationMarks()).toEqual([
      {
        direction: PairedPunctuationDirection.Opening,
        startIndex: 0,
        endIndex: 1,
        text: '(',
      },
    ]);

    const closingParenAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(testEnv.createTextInput(')'));
    expect(closingParenAnalysis.getUnmatchedPunctuationMarks()).toEqual([
      {
        direction: PairedPunctuationDirection.Closing,
        startIndex: 0,
        endIndex: 1,
        text: ')',
      },
    ]);

    const unmatchedOpeningParenAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(
      testEnv.createTextInput('(The rain in [Spain falls] mainly on the plain'),
    );
    expect(unmatchedOpeningParenAnalysis.getUnmatchedPunctuationMarks()).toEqual([
      {
        direction: PairedPunctuationDirection.Opening,
        startIndex: 0,
        endIndex: 1,
        text: '(',
      },
    ]);

    const unmatchedClosingParenAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(
      testEnv.createTextInput('The rain in [Spain falls] mainly on the plain)'),
    );
    expect(unmatchedClosingParenAnalysis.getUnmatchedPunctuationMarks()).toEqual([
      {
        direction: PairedPunctuationDirection.Closing,
        startIndex: 45,
        endIndex: 46,
        text: ')',
      },
    ]);

    const nestedUnmatchedOpeningMarkAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(
      testEnv.createTextInput('(The rain in [Spain falls) mainly on the plain'),
    );
    expect(nestedUnmatchedOpeningMarkAnalysis.getUnmatchedPunctuationMarks()).toEqual([
      {
        direction: PairedPunctuationDirection.Opening,
        startIndex: 13,
        endIndex: 14,
        text: '[',
      },
    ]);

    const nestedUnmatchedClosingMarkAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(
      testEnv.createTextInput('(The rain in ]Spain falls) mainly on the plain'),
    );
    expect(nestedUnmatchedClosingMarkAnalysis.getUnmatchedPunctuationMarks()).toEqual([
      {
        direction: PairedPunctuationDirection.Closing,
        startIndex: 13,
        endIndex: 14,
        text: ']',
      },
    ]);
  });

  it("doesn't identify unmatched Quotation mark errors", () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();

    const unmatchedOpeningQuoteAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(
      testEnv.createTextInput('\u201CThe (rain in [Spain]) falls mainly on the plain'),
    );
    expect(unmatchedOpeningQuoteAnalysis.getUnmatchedPunctuationMarks()).toEqual([]);

    const unmatchedClosingQuoteAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(
      testEnv.createTextInput('The (rain in [Spain\u201D]) falls mainly on the plain'),
    );
    expect(unmatchedClosingQuoteAnalysis.getUnmatchedPunctuationMarks()).toEqual([]);

    const noOtherMarksAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(
      testEnv.createTextInput('\u201CThe rain in Spain\u2019 falls mainly on the plain\u2019'),
    );
    expect(noOtherMarksAnalysis.getUnmatchedPunctuationMarks()).toEqual([]);
  });

  it('identifies pairs of punctuation marks that incorrectly overlap', () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();

    const overlappingPairsAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(
      testEnv.createTextInput('(The rain in [Spain) falls] mainly on the plain.'),
    );
    expect(overlappingPairsAnalysis.getOverlappingPunctuationMarks()).toEqual([
      new OverlappingPairs(
        {
          direction: PairedPunctuationDirection.Opening,
          startIndex: 13,
          endIndex: 14,
          enclosingRange: undefined,
          text: '[',
        },
        {
          direction: PairedPunctuationDirection.Closing,
          startIndex: 19,
          endIndex: 20,
          enclosingRange: undefined,
          text: ')',
        },
      ),
    ]);

    const overlapsWithQuotesAnalysis = testEnv.pairedPunctuationAnalyzer.analyze(
      testEnv.createTextInput('(The rain in \u201CSpain) falls\u201D mainly on the plain.'),
    );
    expect(overlapsWithQuotesAnalysis.getOverlappingPunctuationMarks()).toEqual([
      new OverlappingPairs(
        {
          direction: PairedPunctuationDirection.Opening,
          startIndex: 13,
          endIndex: 14,
          enclosingRange: undefined,
          text: '\u201C',
        },
        {
          direction: PairedPunctuationDirection.Closing,
          startIndex: 19,
          endIndex: 20,
          enclosingRange: undefined,
          text: ')',
        },
      ),
    ]);
  });
});

describe('ScriptureNode tests', () => {
  it('identifies no issues in well-formed paired punctuation spanning across ScriptureNodes', () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();
    const scriptureNode1: ScriptureNode = testEnv.createScriptureNode('some (test text', 5, 15, 5, 30);
    const scriptureNode2: ScriptureNode = testEnv.createScriptureNode('and some) other text', 5, 45, 5, 55);

    expect(
      testEnv.pairedPunctuationAnalyzer
        .analyze(testEnv.createScriptureInput(scriptureNode1, scriptureNode2))
        .getUnmatchedPunctuationMarks(),
    ).toEqual([]);
    expect(
      testEnv.pairedPunctuationAnalyzer
        .analyze(testEnv.createScriptureInput(scriptureNode1, scriptureNode2))
        .getOverlappingPunctuationMarks(),
    ).toEqual([]);
  });

  it('identifies issues in quotations spanning across ScriptureNodes', () => {
    const testEnv: TestEnvironment = TestEnvironment.createWithStandardPairedPunctuation();
    const scriptureNode1: ScriptureNode = testEnv.createScriptureNode('some (test [text', 5, 15, 5, 30);
    const scriptureNode2: ScriptureNode = testEnv.createScriptureNode('and some) other text', 5, 45, 5, 55);

    expect(
      testEnv.pairedPunctuationAnalyzer
        .analyze(testEnv.createScriptureInput(scriptureNode1, scriptureNode2))
        .getUnmatchedPunctuationMarks(),
    ).toEqual([
      {
        direction: PairedPunctuationDirection.Opening,
        startIndex: 11,
        endIndex: 12,
        text: '[',
        enclosingRange: scriptureNode1.range,
      },
    ]);

    expect(
      testEnv.pairedPunctuationAnalyzer
        .analyze(testEnv.createScriptureInput(scriptureNode1, scriptureNode2))
        .getOverlappingPunctuationMarks(),
    ).toEqual([
      new OverlappingPairs(
        {
          direction: PairedPunctuationDirection.Opening,
          startIndex: 11,
          endIndex: 12,
          text: '[',
          enclosingRange: scriptureNode1.range,
        },
        {
          direction: PairedPunctuationDirection.Closing,
          startIndex: 8,
          endIndex: 9,
          text: ')',
          enclosingRange: scriptureNode2.range,
        },
      ),
    ]);
  });
});

class TestEnvironment {
  readonly pairedPunctuationAnalyzer;

  constructor(private readonly pairedPunctuationConfig: PairedPunctuationConfig) {
    this.pairedPunctuationAnalyzer = new PairedPunctuationAnalyzer(this.pairedPunctuationConfig);
  }

  static createWithStandardPairedPunctuation(): TestEnvironment {
    return new TestEnvironment(
      new PairedPunctuationConfig.Builder()
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
