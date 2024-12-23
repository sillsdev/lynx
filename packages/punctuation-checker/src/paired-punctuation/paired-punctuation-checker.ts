import { Diagnostic, DiagnosticFix, DocumentManager, Localizer, TextDocument } from '@sillsdev/lynx';

import { AbstractChecker } from '../abstract-checker';
import { StandardFixProvider } from '../fixes/standard-fixes';
import { PairedPunctuationConfig } from './paired-punctuation-config';
import { PairedPunctuationIssueFinderFactory } from './paired-punctuation-issue-finder';

export const PAIRED_PUNCTUATION_CHECKER_LOCALIZER_NAMESPACE = 'pairedPunctuation';

export const UNMATCHED_OPENING_PARENTHESIS_DIAGNOSTIC_CODE = 'unmatched-opening-parenthesis';
export const UNMATCHED_CLOSING_PARENTHESIS_DIAGNOSTIC_CODE = 'unmatched-closing-parenthesis';
export const UNMATCHED_OPENING_SQUARE_BRACKET_DIAGNOSTIC_CODE = 'unmatched-opening-square-bracket';
export const UNMATCHED_CLOSING_SQUARE_BRACKET_DIAGNOSTIC_CODE = 'unmatched-closing-square-bracket';
export const UNMATCHED_OPENING_CURLY_BRACKET_DIAGNOSTIC_CODE = 'unmatched-opening-curly-bracket';
export const UNMATCHED_CLOSING_CURLY_BRACKET_DIAGNOSTIC_CODE = 'unmatched-closing-curly-bracket';
export const UNMATCHED_OPENING_PUNCTUATION_MARK_DIAGNOSTIC_CODE = 'unmatched-opening-punctuation-mark';
export const UNMATCHED_CLOSING_PUNCTUATION_MARK_DIAGNOSTIC_CODE = 'unmatched-closing-punctuation-mark';
export const OVERLAPPING_PUNCTUATION_PAIR_DIAGNOSTIC_CODE = 'overlapping-punctuation-pairs';

export class PairedPunctuationChecker extends AbstractChecker {
  private readonly standardFixProvider: StandardFixProvider;

  constructor(
    private readonly localizer: Localizer,
    documentManager: DocumentManager<TextDocument>,
    private readonly pairedPunctuationConfig: PairedPunctuationConfig,
  ) {
    super(
      'paired-punctuation-checker',
      documentManager,
      new PairedPunctuationIssueFinderFactory(localizer, pairedPunctuationConfig),
    );
    this.standardFixProvider = new StandardFixProvider(localizer);
  }

  async init(): Promise<void> {
    await super.init();

    // Ideally, we'd like to be able to inject an initialization function, so that
    // tests can provide different messages, but due to the way variable dynamic imports
    // work, the namespace loading function can only appear in this file at this location
    if (!this.localizer.hasNamespace(PAIRED_PUNCTUATION_CHECKER_LOCALIZER_NAMESPACE)) {
      this.localizer.addNamespace(
        PAIRED_PUNCTUATION_CHECKER_LOCALIZER_NAMESPACE,
        (language: string) => import(`./locales/${language}.json`, { with: { type: 'json' } }),
      );
    }

    this.standardFixProvider.init();
  }

  protected getFixes(_textDocument: TextDocument, diagnostic: Diagnostic): DiagnosticFix[] {
    if (
      diagnostic.code === UNMATCHED_CLOSING_CURLY_BRACKET_DIAGNOSTIC_CODE ||
      diagnostic.code === UNMATCHED_CLOSING_PARENTHESIS_DIAGNOSTIC_CODE ||
      diagnostic.code === UNMATCHED_CLOSING_PUNCTUATION_MARK_DIAGNOSTIC_CODE ||
      diagnostic.code === UNMATCHED_CLOSING_SQUARE_BRACKET_DIAGNOSTIC_CODE ||
      diagnostic.code === UNMATCHED_OPENING_CURLY_BRACKET_DIAGNOSTIC_CODE ||
      diagnostic.code === UNMATCHED_OPENING_PARENTHESIS_DIAGNOSTIC_CODE ||
      diagnostic.code === UNMATCHED_OPENING_PUNCTUATION_MARK_DIAGNOSTIC_CODE ||
      diagnostic.code === UNMATCHED_OPENING_SQUARE_BRACKET_DIAGNOSTIC_CODE
    ) {
      return [this.standardFixProvider.punctuationRemovalFix(diagnostic)];
    }
    return [];
  }
}
