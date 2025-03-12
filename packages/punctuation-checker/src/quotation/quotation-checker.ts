import {
  Diagnostic,
  DiagnosticFix,
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
import { PairedPunctuationDirection } from '../utils';
import { QuotationConfig } from './quotation-config';
import { QuotationIssueFinderFactory } from './quotation-issue-finder';
import { QuotationDepth } from './quotation-utils';

export const QUOTATION_CHECKER_LOCALIZER_NAMESPACE = 'quotation';

export const UNMATCHED_OPENING_QUOTE_DIAGNOSTIC_CODE = 'unmatched-opening-quotation-mark';
export const UNMATCHED_CLOSING_QUOTE_DIAGNOSTIC_CODE = 'unmatched-closing-quotation-mark';
export const INCORRECTLY_NESTED_QUOTE_DIAGNOSTIC_CODE = 'incorrectly-nested-quotation-mark';
export const AMBIGUOUS_QUOTE_DIAGNOSTIC_CODE = 'ambiguous-quotation-mark';
export const TOO_DEEPLY_NESTED_QUOTE_DIAGNOSTIC_CODE = 'deeply-nested-quotation-mark';

export class QuotationChecker<TDoc extends TextDocument | ScriptureDocument, TEdit = TextEdit> extends AbstractChecker<
  TDoc,
  TEdit
> {
  private readonly standardFixProviderFactory: StandardFixProviderFactory<TDoc, TEdit>;

  constructor(
    private readonly localizer: Localizer,
    documentAccessor: DocumentAccessor<TDoc>,
    editFactory: EditFactory<TDoc, TEdit>,
    private readonly quotationConfig: QuotationConfig,
  ) {
    super('quotation-mark-checker', documentAccessor, new QuotationIssueFinderFactory(localizer, quotationConfig));
    this.standardFixProviderFactory = new StandardFixProviderFactory<TDoc, TEdit>(editFactory, localizer);
  }

  async init(): Promise<void> {
    await super.init();

    // Ideally, we'd like to be able to inject an initialization function, so that
    // tests can provide different messages, but due to the way variable dynamic imports
    // work, the namespace loading function can only appear in this file at this location
    this.localizer.addNamespace(
      QUOTATION_CHECKER_LOCALIZER_NAMESPACE,
      (language: string) => import(`./locales/${language}.json`, { with: { type: 'json' } }),
    );

    await this.standardFixProviderFactory.init();
  }

  protected getFixes(document: TDoc, diagnostic: Diagnostic): DiagnosticFix<TEdit>[] {
    const standardFixProvider: StandardFixProvider<TDoc, TEdit> =
      this.standardFixProviderFactory.createStandardFixProvider(document);

    if (diagnostic.code === UNMATCHED_OPENING_QUOTE_DIAGNOSTIC_CODE) {
      return [standardFixProvider.punctuationRemovalFix(diagnostic)];
    }
    if (diagnostic.code === UNMATCHED_CLOSING_QUOTE_DIAGNOSTIC_CODE) {
      return [standardFixProvider.punctuationRemovalFix(diagnostic)];
    }

    if (diagnostic.code === INCORRECTLY_NESTED_QUOTE_DIAGNOSTIC_CODE) {
      return this.getIncorrectlyNestedQuoteFixes(diagnostic, standardFixProvider);
    }

    if (diagnostic.code === AMBIGUOUS_QUOTE_DIAGNOSTIC_CODE) {
      return this.getAmbiguousQuoteFixes(diagnostic, standardFixProvider);
    }
    return [];
  }

  private getIncorrectlyNestedQuoteFixes(
    diagnostic: Diagnostic,
    standardFixProvider: StandardFixProvider<TDoc, TEdit>,
  ): DiagnosticFix<TEdit>[] {
    const fixes: DiagnosticFix<TEdit>[] = [standardFixProvider.punctuationRemovalFix(diagnostic)];
    interface QuoteParentDepth {
      depth: number;
    }
    const expectedQuotationMark: string | undefined = this.getExpectedQuotationMarkForDepth(
      (diagnostic.data as QuoteParentDepth).depth,
    );
    if (expectedQuotationMark !== undefined) {
      fixes.push(standardFixProvider.punctuationReplacementFix(diagnostic, expectedQuotationMark));
    }

    return fixes;
  }

  private getExpectedQuotationMarkForDepth(parentDepth: number): string | undefined {
    const expectedQuotationDepth = parentDepth + 1;
    return this.quotationConfig.getUnambiguousQuotationMarkByType(
      QuotationDepth.fromNumber(expectedQuotationDepth),
      PairedPunctuationDirection.Opening,
    );
  }

  private getAmbiguousQuoteFixes(
    diagnostic: Diagnostic,
    standardFixProvider: StandardFixProvider<TDoc, TEdit>,
  ): DiagnosticFix<TEdit>[] {
    interface QuotationMarkCorrection {
      existingQuotationMark: string;
      correctedQuotationMark: string;
    }
    const expectedQuotationMark: string = (diagnostic.data as QuotationMarkCorrection).correctedQuotationMark;
    return [standardFixProvider.punctuationReplacementFix(diagnostic, expectedQuotationMark)];
  }
}
