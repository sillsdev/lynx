import {
  Diagnostic,
  DiagnosticAction,
  DocumentAccessor,
  EditFactory,
  Localizer,
  ScriptureDocument,
  TextDocument,
  TextEdit,
} from '@sillsdev/lynx';

import { AbstractChecker } from '../abstract-checker';
import type { StandardFixProvider } from '../fixes/standard-fixes';
import { StandardFixProviderFactory } from '../fixes/standard-fixes';
import { createLocaleLoader } from '../utils/locale-loader';
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

export class PairedPunctuationChecker<
  TDoc extends TextDocument | ScriptureDocument,
  TEdit = TextEdit,
> extends AbstractChecker<TDoc, TEdit> {
  private readonly standardFixProviderFactory: StandardFixProviderFactory<TDoc, TEdit>;

  constructor(
    private readonly localizer: Localizer,
    documentAccessor: DocumentAccessor<TDoc>,
    editFactory: EditFactory<TDoc, TEdit>,
    pairedPunctuationConfig: PairedPunctuationConfig,
    validateAllDocuments = false,
  ) {
    super(
      'paired-punctuation-checker',
      documentAccessor,
      new PairedPunctuationIssueFinderFactory(localizer, pairedPunctuationConfig),
      validateAllDocuments,
    );
    this.standardFixProviderFactory = new StandardFixProviderFactory<TDoc, TEdit>(editFactory, localizer);
  }

  async init(): Promise<void> {
    await super.init();

    this.localizer.addNamespace(
      PAIRED_PUNCTUATION_CHECKER_LOCALIZER_NAMESPACE,
      createLocaleLoader('paired-punctuation'),
    );

    await this.standardFixProviderFactory.init();
  }

  protected getFixes(document: TDoc, diagnostic: Diagnostic): DiagnosticAction<TEdit>[] {
    const standardFixProvider: StandardFixProvider<TDoc, TEdit> =
      this.standardFixProviderFactory.createStandardFixProvider(document);
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
      return [standardFixProvider.punctuationRemovalFix(diagnostic)];
    }
    return [];
  }
}
