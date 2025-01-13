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
