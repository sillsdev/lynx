import {
  Diagnostic,
  DiagnosticSeverity,
  Localizer,
  ScriptureDocument,
  ScriptureTextDocument,
  TextDocument,
  TextEditFactory,
} from '@sillsdev/lynx';
import { UsfmEditFactory } from '@sillsdev/lynx-usfm';
import { UsfmStylesheet } from '@sillsdev/machine/corpora';
import { describe, expect, it } from 'vitest';

import { StandardFixProvider, StandardFixProviderFactory } from '../../src/fixes/standard-fixes';

describe('PunctuationRemovalFix tests', () => {
  it('targets the character specified in the Diagnostic', async () => {
    const localizer: Localizer = new Localizer();
    const standardFixProviderFactory: StandardFixProviderFactory<TextDocument> =
      new StandardFixProviderFactory<TextDocument>(new TextEditFactory(), localizer);
    await standardFixProviderFactory.init();
    await localizer.init();

    const diagnostic: Diagnostic = {
      code: 'incorrectly-nested-quotation-mark-level-2',
      severity: DiagnosticSeverity.Warning,
      range: {
        start: {
          line: 0,
          character: 8,
        },
        end: {
          line: 0,
          character: 9,
        },
      },
      source: 'quotation-mark-checker',
      message: `Incorrectly nested quotation mark.`,
    };
    const standardFixProvider: StandardFixProvider<TextDocument> = standardFixProviderFactory.createStandardFixProvider(
      new TextDocument('test', 'no-format', 1, ''),
    );

    expect(standardFixProvider.punctuationRemovalFix(diagnostic)).toEqual({
      title: `Delete punctuation mark`,
      isPreferred: false,
      diagnostic,
      edits: [
        {
          range: {
            start: {
              line: 0,
              character: 8,
            },
            end: {
              line: 0,
              character: 9,
            },
          },
          newText: '',
        },
      ],
    });
  });

  it('also works correctly with ScriptureDocuments', async () => {
    const localizer: Localizer = new Localizer();
    const stylesheet = new UsfmStylesheet('usfm.sty');
    const standardFixProviderFactory: StandardFixProviderFactory<ScriptureDocument> =
      new StandardFixProviderFactory<ScriptureDocument>(new UsfmEditFactory(stylesheet), localizer);
    await standardFixProviderFactory.init();
    await localizer.init();

    const diagnostic: Diagnostic = {
      code: 'incorrectly-nested-quotation-mark-level-2',
      severity: DiagnosticSeverity.Warning,
      range: {
        start: {
          line: 0,
          character: 8,
        },
        end: {
          line: 0,
          character: 9,
        },
      },
      source: 'quotation-mark-checker',
      message: `Incorrectly nested quotation mark.`,
    };
    const standardFixProvider: StandardFixProvider<ScriptureDocument> =
      standardFixProviderFactory.createStandardFixProvider(new ScriptureTextDocument('test', 'usfm', 1, ''));

    expect(standardFixProvider.punctuationRemovalFix(diagnostic)).toEqual({
      title: `Delete punctuation mark`,
      isPreferred: false,
      diagnostic,
      edits: [
        {
          range: {
            start: {
              line: 0,
              character: 8,
            },
            end: {
              line: 0,
              character: 9,
            },
          },
          newText: '',
        },
      ],
    });
  });
});

describe('PunctuationReplacementFix tests', () => {
  it('targets the character specified in the Diagnostic', async () => {
    const localizer: Localizer = new Localizer();
    const standardFixProviderFactory: StandardFixProviderFactory<TextDocument> =
      new StandardFixProviderFactory<TextDocument>(new TextEditFactory(), localizer);
    await standardFixProviderFactory.init();
    await localizer.init();

    const diagnostic: Diagnostic = {
      code: 'incorrectly-nested-quotation-mark-level-2',
      severity: DiagnosticSeverity.Warning,
      range: {
        start: {
          line: 3,
          character: 19,
        },
        end: {
          line: 3,
          character: 20,
        },
      },
      source: 'quotation-mark-checker',
      message: `Incorrectly nested quotation mark.`,
    };
    const standardFixProvider: StandardFixProvider<TextDocument> = standardFixProviderFactory.createStandardFixProvider(
      new TextDocument('test', 'no-format', 1, ''),
    );

    expect(standardFixProvider.punctuationReplacementFix(diagnostic, '\u201F')).toEqual({
      title: `Replace this character with \u201F`,
      isPreferred: true,
      diagnostic,
      edits: [
        {
          range: {
            start: {
              line: 3,
              character: 19,
            },
            end: {
              line: 3,
              character: 20,
            },
          },
          newText: '\u201F',
        },
      ],
    });
  });

  it('also works with ScriptureDocuments', async () => {
    const localizer: Localizer = new Localizer();
    const stylesheet = new UsfmStylesheet('usfm.sty');
    const standardFixProviderFactory: StandardFixProviderFactory<ScriptureDocument> =
      new StandardFixProviderFactory<ScriptureDocument>(new UsfmEditFactory(stylesheet), localizer);
    await standardFixProviderFactory.init();
    await localizer.init();

    const diagnostic: Diagnostic = {
      code: 'incorrectly-nested-quotation-mark-level-2',
      severity: DiagnosticSeverity.Warning,
      range: {
        start: {
          line: 3,
          character: 19,
        },
        end: {
          line: 3,
          character: 20,
        },
      },
      source: 'quotation-mark-checker',
      message: `Incorrectly nested quotation mark.`,
    };
    const standardFixProvider: StandardFixProvider<ScriptureDocument> =
      standardFixProviderFactory.createStandardFixProvider(new ScriptureTextDocument('test', 'usfm', 1, ''));

    expect(standardFixProvider.punctuationReplacementFix(diagnostic, '\u201F')).toEqual({
      title: `Replace this character with \u201F`,
      isPreferred: true,
      diagnostic,
      edits: [
        {
          range: {
            start: {
              line: 3,
              character: 19,
            },
            end: {
              line: 3,
              character: 20,
            },
          },
          newText: '\u201F',
        },
      ],
    });
  });
});

describe('LeadingSpaceInsertionFix tests', () => {
  it('inserts the space just before the range identified in the Diagnostic', async () => {
    const localizer: Localizer = new Localizer();
    const standardFixProviderFactory: StandardFixProviderFactory<TextDocument> =
      new StandardFixProviderFactory<TextDocument>(new TextEditFactory(), localizer);
    await standardFixProviderFactory.init();
    await localizer.init();

    const diagnostic: Diagnostic = {
      code: 'incorrect-leading-whitespace',
      severity: DiagnosticSeverity.Warning,
      range: {
        start: {
          line: 3,
          character: 19,
        },
        end: {
          line: 3,
          character: 20,
        },
      },
      source: 'whitespace',
      message: `This punctuation mark should be preceded by whitespace.`,
    };
    const standardFixProvider: StandardFixProvider<TextDocument> = standardFixProviderFactory.createStandardFixProvider(
      new TextDocument('test', 'no-format', 1, ''),
    );

    expect(standardFixProvider.leadingSpaceInsertionFix(diagnostic)).toEqual({
      title: `Add a space before this`,
      isPreferred: true,
      diagnostic,
      edits: [
        {
          range: {
            start: {
              line: 3,
              character: 19,
            },
            end: {
              line: 3,
              character: 19,
            },
          },
          newText: ' ',
        },
      ],
    });
  });

  it('also works with ScriptureDocuments', async () => {
    const localizer: Localizer = new Localizer();
    const stylesheet = new UsfmStylesheet('usfm.sty');
    const standardFixProviderFactory: StandardFixProviderFactory<ScriptureDocument> =
      new StandardFixProviderFactory<ScriptureDocument>(new UsfmEditFactory(stylesheet), localizer);
    await standardFixProviderFactory.init();
    await localizer.init();

    const diagnostic: Diagnostic = {
      code: 'incorrect-leading-whitespace',
      severity: DiagnosticSeverity.Warning,
      range: {
        start: {
          line: 3,
          character: 19,
        },
        end: {
          line: 3,
          character: 20,
        },
      },
      source: 'whitespace',
      message: `This punctuation mark should be preceded by whitespace.`,
    };
    const standardFixProvider: StandardFixProvider<ScriptureDocument> =
      standardFixProviderFactory.createStandardFixProvider(new ScriptureTextDocument('test', 'usfm', 1, ''));

    expect(standardFixProvider.leadingSpaceInsertionFix(diagnostic)).toEqual({
      title: `Add a space before this`,
      isPreferred: true,
      diagnostic,
      edits: [
        {
          range: {
            start: {
              line: 3,
              character: 19,
            },
            end: {
              line: 3,
              character: 19,
            },
          },
          newText: ' ',
        },
      ],
    });
  });
});

describe('TrailingSpaceInsertionFix tests', () => {
  it('inserts the space just after the range identified in the Diagnostic', async () => {
    const localizer: Localizer = new Localizer();
    const standardFixProviderFactory: StandardFixProviderFactory<TextDocument> =
      new StandardFixProviderFactory<TextDocument>(new TextEditFactory(), localizer);
    await standardFixProviderFactory.init();
    await localizer.init();

    const diagnostic: Diagnostic = {
      code: 'incorrect-trailing-whitespace',
      severity: DiagnosticSeverity.Warning,
      range: {
        start: {
          line: 3,
          character: 19,
        },
        end: {
          line: 3,
          character: 20,
        },
      },
      source: 'whitespace',
      message: `This punctuation mark should be followed by whitespace.`,
    };
    const standardFixProvider: StandardFixProvider<TextDocument> = standardFixProviderFactory.createStandardFixProvider(
      new TextDocument('test', 'no-format', 1, ''),
    );

    expect(standardFixProvider.trailingSpaceInsertionFix(diagnostic)).toEqual({
      title: `Add a space after this`,
      isPreferred: true,
      diagnostic,
      edits: [
        {
          range: {
            start: {
              line: 3,
              character: 20,
            },
            end: {
              line: 3,
              character: 20,
            },
          },
          newText: ' ',
        },
      ],
    });
  });

  it('also works with ScriptureDocuments', async () => {
    const localizer: Localizer = new Localizer();
    const stylesheet = new UsfmStylesheet('usfm.sty');
    const standardFixProviderFactory: StandardFixProviderFactory<ScriptureDocument> =
      new StandardFixProviderFactory<ScriptureDocument>(new UsfmEditFactory(stylesheet), localizer);
    await standardFixProviderFactory.init();
    await localizer.init();

    const diagnostic: Diagnostic = {
      code: 'incorrect-trailing-whitespace',
      severity: DiagnosticSeverity.Warning,
      range: {
        start: {
          line: 3,
          character: 19,
        },
        end: {
          line: 3,
          character: 20,
        },
      },
      source: 'whitespace',
      message: `This punctuation mark should be followed by whitespace.`,
    };
    const standardFixProvider: StandardFixProvider<ScriptureDocument> =
      standardFixProviderFactory.createStandardFixProvider(new ScriptureTextDocument('test', 'usfm', 1, ''));

    expect(standardFixProvider.trailingSpaceInsertionFix(diagnostic)).toEqual({
      title: `Add a space after this`,
      isPreferred: true,
      diagnostic,
      edits: [
        {
          range: {
            start: {
              line: 3,
              character: 20,
            },
            end: {
              line: 3,
              character: 20,
            },
          },
          newText: ' ',
        },
      ],
    });
  });
});

describe('TrailingStringInsertionFix tests', () => {
  it('inserts the provided string just after the range identified in the Diagnostic', async () => {
    const localizer: Localizer = new Localizer();
    const standardFixProviderFactory: StandardFixProviderFactory<TextDocument> =
      new StandardFixProviderFactory<TextDocument>(new TextEditFactory(), localizer);
    await standardFixProviderFactory.init();
    await localizer.init();

    const diagnostic: Diagnostic = {
      code: 'missing-quote-continuer',
      severity: DiagnosticSeverity.Error,
      range: {
        start: {
          line: 3,
          character: 19,
        },
        end: {
          line: 3,
          character: 20,
        },
      },
      source: 'quotation',
      message: `Missing quotation mark when continuing a quote across multiple paragraphs.`,
    };
    const standardFixProvider: StandardFixProvider<TextDocument> = standardFixProviderFactory.createStandardFixProvider(
      new TextDocument('test', 'no-format', 1, ''),
    );

    expect(standardFixProvider.trailingStringInsertionFix(diagnostic, '\u2018\u201c')).toEqual({
      title: `Insert the missing characters: \u2018\u201c`,
      isPreferred: true,
      diagnostic,
      edits: [
        {
          range: {
            start: {
              line: 3,
              character: 20,
            },
            end: {
              line: 3,
              character: 20,
            },
          },
          newText: '\u2018\u201c',
        },
      ],
    });
  });

  it('also works with ScriptureDocuments', async () => {
    const localizer: Localizer = new Localizer();
    const stylesheet = new UsfmStylesheet('usfm.sty');
    const standardFixProviderFactory: StandardFixProviderFactory<ScriptureDocument> =
      new StandardFixProviderFactory<ScriptureDocument>(new UsfmEditFactory(stylesheet), localizer);
    await standardFixProviderFactory.init();
    await localizer.init();

    const diagnostic: Diagnostic = {
      code: 'missing-quote-continuer',
      severity: DiagnosticSeverity.Error,
      range: {
        start: {
          line: 3,
          character: 19,
        },
        end: {
          line: 3,
          character: 20,
        },
      },
      source: 'quotation',
      message: `Missing quotation mark when continuing a quote across multiple paragraphs.`,
    };
    const standardFixProvider: StandardFixProvider<ScriptureDocument> =
      standardFixProviderFactory.createStandardFixProvider(new ScriptureTextDocument('test', 'usfm', 1, ''));

    expect(standardFixProvider.trailingStringInsertionFix(diagnostic, '\u2018\u201c')).toEqual({
      title: `Insert the missing characters: \u2018\u201c`,
      isPreferred: true,
      diagnostic,
      edits: [
        {
          range: {
            start: {
              line: 3,
              character: 20,
            },
            end: {
              line: 3,
              character: 20,
            },
          },
          newText: '\u2018\u201c',
        },
      ],
    });
  });
});
