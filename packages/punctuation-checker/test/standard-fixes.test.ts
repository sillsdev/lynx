import { Diagnostic, DiagnosticSeverity } from '@sillsdev/lynx';
import { describe, expect, it } from 'vitest';

import { StandardFixes } from '../src/standard-fixes';

describe('PunctuationRemovalFix tests', () => {
  it('targets the character specified in the Diagnostic', () => {
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

    expect(StandardFixes.punctuationRemovalFix(diagnostic)).toEqual({
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
  it('targets the character specified in the Diagnostic', () => {
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

    expect(StandardFixes.punctuationReplacementFix(diagnostic, '\u201F')).toEqual({
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
