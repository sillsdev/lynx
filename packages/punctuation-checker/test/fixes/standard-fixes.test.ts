import { Diagnostic, DiagnosticSeverity, Localizer } from '@sillsdev/lynx';
import { describe, expect, it } from 'vitest';

import { StandardFixProvider } from '../../src/fixes/standard-fixes';

describe('PunctuationRemovalFix tests', () => {
  it('targets the character specified in the Diagnostic', async () => {
    const localizer: Localizer = new Localizer();
    const standardFixProvider: StandardFixProvider = new StandardFixProvider(localizer);
    standardFixProvider.init();
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
    const standardFixProvider: StandardFixProvider = new StandardFixProvider(localizer);
    standardFixProvider.init();
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
