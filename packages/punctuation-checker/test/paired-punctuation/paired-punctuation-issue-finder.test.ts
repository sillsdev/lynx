import { DiagnosticSeverity, Localizer, ScriptureNode, ScriptureText } from '@sillsdev/lynx';
import { describe, expect, it } from 'vitest';

import { DiagnosticFactory } from '../../src/diagnostic-factory';
import { PairedPunctuationConfig } from '../../src/paired-punctuation/paired-punctuation-config';
import { PairedPunctuationIssueFinder } from '../../src/paired-punctuation/paired-punctuation-issue-finder';
import { ScriptureNodeGroup } from '../../src/utils';
import { StubFixedLineWidthTextDocument, StubSingleLineTextDocument } from '../test-utils';

describe('Text tests', () => {
  it('creates no Diagnostics for error-free text', async () => {
    const testEnv: TextTestEnvironment = TextTestEnvironment.createWithStandardPairedPunctuationAndAngleBrackets();
    await testEnv.init();
    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics('The rain in Spain falls mainly on the plain.'),
    ).toEqual([]);
  });

  it('creates Diagnostics for unmatched paired punctuation', async () => {
    const testEnv: TextTestEnvironment = TextTestEnvironment.createWithStandardPairedPunctuationAndAngleBrackets();
    await testEnv.init();

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics('The (rain in Spain falls mainly on the plain.'),
    ).toEqual([
      {
        code: 'unmatched-opening-parenthesis',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 0,
            character: 4,
          },
          end: {
            line: 0,
            character: 5,
          },
        },
        message: 'Opening parenthesis with no closing parenthesis.',
        data: '',
      },
    ]);

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics('The [rain in Spain falls mainly on the plain.'),
    ).toEqual([
      {
        code: 'unmatched-opening-square-bracket',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 0,
            character: 4,
          },
          end: {
            line: 0,
            character: 5,
          },
        },
        message: 'Opening square bracket with no closing bracket.',
        data: '',
      },
    ]);

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics('The {rain in Spain falls mainly on the plain.'),
    ).toEqual([
      {
        code: 'unmatched-opening-curly-bracket',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 0,
            character: 4,
          },
          end: {
            line: 0,
            character: 5,
          },
        },
        message: 'Opening curly bracket with no closing bracket.',
        data: '',
      },
    ]);

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics('The <rain in Spain falls mainly on the plain.'),
    ).toEqual([
      {
        code: 'unmatched-opening-punctuation-mark',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 0,
            character: 4,
          },
          end: {
            line: 0,
            character: 5,
          },
        },
        message: 'Opening punctuation mark with no closing mark.',
        data: '',
      },
    ]);

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics('The )rain in Spain falls mainly on the plain.'),
    ).toEqual([
      {
        code: 'unmatched-closing-parenthesis',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 0,
            character: 4,
          },
          end: {
            line: 0,
            character: 5,
          },
        },
        message: 'Closing parenthesis with no opening parenthesis.',
        data: '',
      },
    ]);

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics('The ]rain in Spain falls mainly on the plain.'),
    ).toEqual([
      {
        code: 'unmatched-closing-square-bracket',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 0,
            character: 4,
          },
          end: {
            line: 0,
            character: 5,
          },
        },
        message: 'Closing square bracket with no opening bracket.',
        data: '',
      },
    ]);

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics('The }rain in Spain falls mainly on the plain.'),
    ).toEqual([
      {
        code: 'unmatched-closing-curly-bracket',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 0,
            character: 4,
          },
          end: {
            line: 0,
            character: 5,
          },
        },
        message: 'Closing curly bracket with no opening bracket.',
        data: '',
      },
    ]);

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics('The >rain in Spain falls mainly on the plain.'),
    ).toEqual([
      {
        code: 'unmatched-closing-punctuation-mark',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 0,
            character: 4,
          },
          end: {
            line: 0,
            character: 5,
          },
        },
        message: 'Closing punctuation mark with no opening mark.',
        data: '',
      },
    ]);

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics('The (rain in Spain falls] mainly on the plain.'),
    ).toEqual([
      {
        code: 'unmatched-closing-square-bracket',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 0,
            character: 24,
          },
          end: {
            line: 0,
            character: 25,
          },
        },
        message: 'Closing square bracket with no opening bracket.',
        data: '',
      },
      {
        code: 'unmatched-opening-parenthesis',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 0,
            character: 4,
          },
          end: {
            line: 0,
            character: 5,
          },
        },
        message: 'Opening parenthesis with no closing parenthesis.',
        data: '',
      },
    ]);

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics(
        'The \u2018rain in Spain falls mainly\u2019 on the {plain.',
      ),
    ).toEqual([
      {
        code: 'unmatched-opening-curly-bracket',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 0,
            character: 40,
          },
          end: {
            line: 0,
            character: 41,
          },
        },
        message: 'Opening curly bracket with no closing bracket.',
        data: '',
      },
    ]);
  });

  it('does not create Diagnostics for unmatched quotes', async () => {
    const testEnv: TextTestEnvironment = TextTestEnvironment.createWithStandardPairedPunctuationAndAngleBrackets();
    await testEnv.init();

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics('The rain in \u201CSpain falls mainly on the plain.'),
    ).toEqual([]);
    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics('The rain in (Spain falls mainly) on the plain.\u2019'),
    ).toEqual([]);
  });

  it('creates Diagnostics for incorrectly overlapping paired punctuation', async () => {
    const testEnv: TextTestEnvironment = TextTestEnvironment.createWithStandardPairedPunctuationAndAngleBrackets();
    await testEnv.init();

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics('The (rain in [Spain) falls mainly] on the plain.'),
    ).toEqual([
      {
        code: 'overlapping-punctuation-pairs',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Warning,
        range: {
          start: {
            line: 0,
            character: 19,
          },
          end: {
            line: 0,
            character: 20,
          },
        },
        message: 'This pair of punctuation marks (\u2026) overlaps with another pair [\u2026].',
        data: '',
      },
      {
        code: 'overlapping-punctuation-pairs',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Warning,
        range: {
          start: {
            line: 0,
            character: 13,
          },
          end: {
            line: 0,
            character: 14,
          },
        },
        message: 'This pair of punctuation marks [\u2026] overlaps with another pair (\u2026).',
        data: '',
      },
    ]);

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnostics(
        'The \u201Crain in {Spain\u201D falls mainly} on the plain.',
      ),
    ).toEqual([
      {
        code: 'overlapping-punctuation-pairs',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Warning,
        range: {
          start: {
            line: 0,
            character: 19,
          },
          end: {
            line: 0,
            character: 20,
          },
        },
        message: 'This pair of punctuation marks \u201C\u2026\u201D overlaps with another pair {\u2026}.',
        data: '',
      },
      {
        code: 'overlapping-punctuation-pairs',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Warning,
        range: {
          start: {
            line: 0,
            character: 13,
          },
          end: {
            line: 0,
            character: 14,
          },
        },
        message: 'This pair of punctuation marks {\u2026} overlaps with another pair \u201C\u2026\u201D.',
        data: '',
      },
    ]);
  });
});

describe('ScriptureDocument tests', () => {
  it('produces no errors for well-formed text', async () => {
    const testEnv: ScriptureTestEnvironment =
      ScriptureTestEnvironment.createWithStandardPairedPunctuationAndAngleBrackets();
    await testEnv.init();

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnosticsForScripture(
        testEnv.createScriptureNode('Genesis', 3, 13, 3, 20),
      ),
    ).toEqual([]);
    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnosticsForScripture(
        testEnv.createScriptureNode('Isaac and Rebekah', 8, 13, 3, 27),
      ),
    ).toEqual([]);
    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnosticsForScripture(
        testEnv.createScriptureNode(
          'The servant said to him, (Perhaps the woman may not be willing to follow me to this land. Must I then take your son back to the land from which you came?)',
          10,
          13,
          10,
          167,
        ),
      ),
    ).toEqual([]);
  });

  it('identifies quotation errors in a single text node', async () => {
    const testEnv: ScriptureTestEnvironment =
      ScriptureTestEnvironment.createWithStandardPairedPunctuationAndAngleBrackets();
    await testEnv.init();

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnosticsForScripture(
        testEnv.createScriptureNode(
          'The servant said to him, (Perhaps the woman may not be ]willing to follow me to this land. Must I then take your son back to the land from which you came?)',
          10,
          13,
          10,
          168,
        ),
      ),
    ).toEqual([
      {
        code: 'unmatched-closing-square-bracket',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 10,
            character: 68,
          },
          end: {
            line: 10,
            character: 69,
          },
        },
        message: 'Closing square bracket with no opening bracket.',
        data: '',
      },
    ]);
  });

  it('produces no issues for well-formed quotes that span across ScriptureNodes', async () => {
    const testEnv: ScriptureTestEnvironment =
      ScriptureTestEnvironment.createWithStandardPairedPunctuationAndAngleBrackets();
    await testEnv.init();

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnosticsForScripture(
        ScriptureNodeGroup.createFromNodes([
          testEnv.createScriptureNode(
            'Abraham said to him, (See to it that you do not take my son back there. ',
            10,
            13,
            10,
            83,
          ),
          testEnv.createScriptureNode(
            "The Lord, the God of heaven, who took me from my father's house and from the land of my kindred, and who spoke to me and swore to me, [To your offspring I will give this land], he will send his angel before you, and you shall take a wife for my son from there.",
            11,
            13,
            11,
            272,
          ),
          testEnv.createScriptureNode(
            'But if the woman is not willing to follow you, then you will be free from this oath of mine; only you must not take my son back there.)',
            12,
            13,
            12,
            147,
          ),
        ]),
      ),
    ).toEqual([]);
  });

  it('correctly identifies issues that occur in groups of multiple ScriptureNodes', async () => {
    const testEnv: ScriptureTestEnvironment =
      ScriptureTestEnvironment.createWithStandardPairedPunctuationAndAngleBrackets();
    await testEnv.init();

    expect(
      testEnv.pairedPunctuationErrorFinder.produceDiagnosticsForScripture(
        ScriptureNodeGroup.createFromNodes([
          testEnv.createScriptureNode(
            'Abraham said to him, (See to it that you do not take my son back there. ',
            10,
            13,
            10,
            83,
          ),
          testEnv.createScriptureNode(
            "The Lord, the God of heaven, who took me from my father's house and from the land of my kindred, and who spoke to me and swore to me, [To your offspring I will give this land), he will send his angel before you, and you shall take a wife for my son from there.",
            11,
            13,
            11,
            272,
          ),
          testEnv.createScriptureNode(
            'But if the woman is not willing to follow you, then you will be free from this oath of mine; only you must not take my son back there.)',
            12,
            13,
            12,
            147,
          ),
        ]),
      ),
    ).toEqual([
      {
        code: 'unmatched-closing-parenthesis',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 12,
            character: 147,
          },
          end: {
            line: 12,
            character: 148,
          },
        },
        message: 'Closing parenthesis with no opening parenthesis.',
        data: '',
      },
      {
        code: 'unmatched-opening-square-bracket',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line: 11,
            character: 147,
          },
          end: {
            line: 11,
            character: 148,
          },
        },
        message: 'Opening square bracket with no closing bracket.',
        data: '',
      },
      {
        code: 'overlapping-punctuation-pairs',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Warning,
        range: {
          start: {
            line: 11,
            character: 187,
          },
          end: {
            line: 11,
            character: 188,
          },
        },
        message: 'This pair of punctuation marks (…) overlaps with another pair […].',
        data: '',
      },
      {
        code: 'overlapping-punctuation-pairs',
        source: 'paired-punctuation-checker',
        severity: DiagnosticSeverity.Warning,
        range: {
          start: {
            line: 11,
            character: 147,
          },
          end: {
            line: 11,
            character: 148,
          },
        },
        message: 'This pair of punctuation marks […] overlaps with another pair (…).',
        data: '',
      },
    ]);
  });
});

class TextTestEnvironment {
  readonly pairedPunctuationErrorFinder;

  private readonly pairedPunctuationErrorFinderLocalizer: Localizer; // we have separate localizers for the two classes

  constructor(
    private readonly pairedPunctuationConfig: PairedPunctuationConfig,
    private readonly customLocalizer?: Localizer,
  ) {
    this.pairedPunctuationErrorFinderLocalizer = this.createDefaultLocalizer();

    const stubDiagnosticFactory: DiagnosticFactory = new DiagnosticFactory(
      'paired-punctuation-checker',
      new StubSingleLineTextDocument(''), // passing an empty document is fine here since we don't use getText()
    );
    this.pairedPunctuationErrorFinder = new PairedPunctuationIssueFinder(
      this.customLocalizer ?? this.pairedPunctuationErrorFinderLocalizer,
      this.pairedPunctuationConfig,
      stubDiagnosticFactory,
    );
  }

  private createDefaultLocalizer(): Localizer {
    const defaultLocalizer: Localizer = new Localizer();
    defaultLocalizer.addNamespace('pairedPunctuation', (_language: string) => {
      return {
        diagnosticMessagesByCode: {
          'unmatched-opening-parenthesis': 'Opening parenthesis with no closing parenthesis.',
          'unmatched-closing-parenthesis': 'Closing parenthesis with no opening parenthesis.',
          'unmatched-opening-square-bracket': 'Opening square bracket with no closing bracket.',
          'unmatched-closing-square-bracket': 'Closing square bracket with no opening bracket.',
          'unmatched-opening-curly-bracket': 'Opening curly bracket with no closing bracket.',
          'unmatched-closing-curly-bracket': 'Closing curly bracket with no opening bracket.',
          'unmatched-opening-punctuation-mark': 'Opening punctuation mark with no closing mark.',
          'unmatched-closing-punctuation-mark': 'Closing punctuation mark with no opening mark.',
          'overlapping-punctuation-pairs':
            'This pair of punctuation marks {{firstPair}} overlaps with another pair {{secondPair}}.',
        },
      };
    });
    return defaultLocalizer;
  }

  public async init(): Promise<void> {
    await this.pairedPunctuationErrorFinderLocalizer.init();
    await this.customLocalizer?.init();
  }

  static createWithStandardPairedPunctuationAndAngleBrackets(): TextTestEnvironment {
    return new TextTestEnvironment(
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
        .addRule({
          openingPunctuationMark: '<',
          closingPunctuationMark: '>',
        })
        .build(),
    );
  }
}

class ScriptureTestEnvironment {
  readonly pairedPunctuationErrorFinder;

  private readonly pairedPunctuationErrorFinderLocalizer: Localizer; // we have separate localizers for the two classes

  constructor(
    private readonly pairedPunctuationConfig: PairedPunctuationConfig,
    private readonly customLocalizer?: Localizer,
  ) {
    this.pairedPunctuationErrorFinderLocalizer = this.createDefaultLocalizer();

    const stubDiagnosticFactory: DiagnosticFactory = new DiagnosticFactory(
      'paired-punctuation-checker',
      new StubFixedLineWidthTextDocument(''), // passing an empty document is fine here since we don't use getText()
    );
    this.pairedPunctuationErrorFinder = new PairedPunctuationIssueFinder(
      this.customLocalizer ?? this.pairedPunctuationErrorFinderLocalizer,
      this.pairedPunctuationConfig,
      stubDiagnosticFactory,
    );
  }

  private createDefaultLocalizer(): Localizer {
    const defaultLocalizer: Localizer = new Localizer();
    defaultLocalizer.addNamespace('pairedPunctuation', (_language: string) => {
      return {
        diagnosticMessagesByCode: {
          'unmatched-opening-parenthesis': 'Opening parenthesis with no closing parenthesis.',
          'unmatched-closing-parenthesis': 'Closing parenthesis with no opening parenthesis.',
          'unmatched-opening-square-bracket': 'Opening square bracket with no closing bracket.',
          'unmatched-closing-square-bracket': 'Closing square bracket with no opening bracket.',
          'unmatched-opening-curly-bracket': 'Opening curly bracket with no closing bracket.',
          'unmatched-closing-curly-bracket': 'Closing curly bracket with no opening bracket.',
          'unmatched-opening-punctuation-mark': 'Opening punctuation mark with no closing mark.',
          'unmatched-closing-punctuation-mark': 'Closing punctuation mark with no opening mark.',
          'overlapping-punctuation-pairs':
            'This pair of punctuation marks {{firstPair}} overlaps with another pair {{secondPair}}.',
        },
      };
    });
    return defaultLocalizer;
  }

  public async init(): Promise<void> {
    await this.pairedPunctuationErrorFinderLocalizer.init();
    await this.customLocalizer?.init();
  }

  static createWithStandardPairedPunctuationAndAngleBrackets(): ScriptureTestEnvironment {
    return new ScriptureTestEnvironment(
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
        .addRule({
          openingPunctuationMark: '<',
          closingPunctuationMark: '>',
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
}
