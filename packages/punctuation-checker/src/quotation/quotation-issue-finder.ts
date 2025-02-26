import { Diagnostic, DiagnosticSeverity, Localizer } from '@sillsdev/lynx';

import { CheckableGroup } from '../checkable';
import { DiagnosticFactory } from '../diagnostic-factory';
import { DiagnosticList } from '../diagnostic-list';
import { IssueFinder, IssueFinderFactory } from '../issue-finder';
import { PairedPunctuationDirection } from '../utils';
import { QuotationAnalysis, QuotationAnalyzer } from './quotation-analyzer';
import {
  AMBIGUOUS_QUOTE_DIAGNOSTIC_CODE,
  INCORRECTLY_NESTED_QUOTE_DIAGNOSTIC_CODE,
  QUOTATION_CHECKER_LOCALIZER_NAMESPACE,
  TOO_DEEPLY_NESTED_QUOTE_DIAGNOSTIC_CODE,
  UNMATCHED_CLOSING_QUOTE_DIAGNOSTIC_CODE,
  UNMATCHED_OPENING_QUOTE_DIAGNOSTIC_CODE,
} from './quotation-checker';
import { QuotationConfig } from './quotation-config';
import { QuoteCorrection, QuoteMetadata } from './quotation-utils';

export class QuotationIssueFinderFactory implements IssueFinderFactory {
  constructor(
    private readonly localizer: Localizer,
    private readonly quotationConfig: QuotationConfig,
  ) {}

  public createIssueFinder(diagnosticFactory: DiagnosticFactory): IssueFinder {
    return new QuotationIssueFinder(this.localizer, this.quotationConfig, diagnosticFactory);
  }
}

export class QuotationIssueFinder implements IssueFinder {
  private diagnosticList: DiagnosticList;

  constructor(
    private readonly localizer: Localizer,
    private readonly quotationConfig: QuotationConfig,
    private readonly diagnosticFactory: DiagnosticFactory,
  ) {
    this.diagnosticList = new DiagnosticList();
  }

  private reset(): void {
    this.diagnosticList = new DiagnosticList();
  }

  public produceDiagnostics(checkableGroup: CheckableGroup): Diagnostic[] {
    this.reset();
    const quotationAnalyzer: QuotationAnalyzer = new QuotationAnalyzer(this.quotationConfig);
    const analysis: QuotationAnalysis = quotationAnalyzer.analyze(checkableGroup);

    this.createDiagnostics(analysis);
    return this.diagnosticList.toArray();
  }

  private createDiagnostics(analysis: QuotationAnalysis) {
    this.createUnmatchedQuoteDiagnostics(analysis);
    this.createIncorrectlyNestedQuoteDiagnostics(analysis);
    this.createAmbiguousQuoteDiagnostics(analysis);
    this.createTooDeeplyNestedQuoteDiagnostics(analysis);
  }

  private createUnmatchedQuoteDiagnostics(analysis: QuotationAnalysis): void {
    for (const unmatchedQuote of analysis.getUnmatchedQuotes()) {
      this.addUnmatchedQuoteError(unmatchedQuote);
    }
  }

  private createIncorrectlyNestedQuoteDiagnostics(analysis: QuotationAnalysis): void {
    for (const incorrectlyNestedQuote of analysis.getIncorrectlyNestedQuotes()) {
      this.addIncorrectlyNestedQuoteWarning(incorrectlyNestedQuote);
    }
  }

  private createAmbiguousQuoteDiagnostics(analysis: QuotationAnalysis): void {
    for (const quoteCorrection of analysis.getAmbiguousQuoteCorrections()) {
      this.addAmbiguousQuoteWarning(quoteCorrection);
    }
  }

  private createTooDeeplyNestedQuoteDiagnostics(analysis: QuotationAnalysis): void {
    for (const tooDeeplyNestedQuote of analysis.getTooDeeplyNestedQuotes()) {
      this.addTooDeeplyNestedQuoteWarning(tooDeeplyNestedQuote);
    }
  }

  private addIncorrectlyNestedQuoteWarning(quotationMark: QuoteMetadata): void {
    const code: string = INCORRECTLY_NESTED_QUOTE_DIAGNOSTIC_CODE;

    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(code)
      .setSeverity(DiagnosticSeverity.Warning)
      .setRange(quotationMark.startIndex, quotationMark.endIndex, quotationMark.enclosingRange)
      .setMessage(this.getErrorMessageByCode(code))
      .setData({ depth: quotationMark.parentDepth?.asNumber() ?? 0 })
      .build();

    this.diagnosticList.addDiagnostic(diagnostic);
  }

  private getErrorMessageByCode(errorCode: string): string {
    return this.localizer.t(`diagnosticMessagesByCode.${errorCode}`, {
      ns: QUOTATION_CHECKER_LOCALIZER_NAMESPACE,
    });
  }

  private addUnmatchedQuoteError(quotationMark: QuoteMetadata): void {
    if (quotationMark.direction === PairedPunctuationDirection.Opening) {
      this.addUnmatchedOpeningQuoteError(quotationMark);
    } else if (quotationMark.direction === PairedPunctuationDirection.Closing) {
      this.addUnmatchedClosingQuoteError(quotationMark);
    }
  }

  private addUnmatchedOpeningQuoteError(quotationMark: QuoteMetadata): void {
    const code: string = UNMATCHED_OPENING_QUOTE_DIAGNOSTIC_CODE;
    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(code)
      .setSeverity(DiagnosticSeverity.Error)
      .setRange(quotationMark.startIndex, quotationMark.endIndex, quotationMark.enclosingRange)
      .setMessage(this.getErrorMessageByCode(code))
      .build();
    this.diagnosticList.addDiagnostic(diagnostic);
  }

  private addUnmatchedClosingQuoteError(quotationMark: QuoteMetadata): void {
    const code = UNMATCHED_CLOSING_QUOTE_DIAGNOSTIC_CODE;
    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(code)
      .setSeverity(DiagnosticSeverity.Error)
      .setRange(quotationMark.startIndex, quotationMark.endIndex, quotationMark.enclosingRange)
      .setMessage(this.getErrorMessageByCode(code))
      .build();
    this.diagnosticList.addDiagnostic(diagnostic);
  }

  private addAmbiguousQuoteWarning(quoteCorrection: QuoteCorrection): void {
    const code: string = AMBIGUOUS_QUOTE_DIAGNOSTIC_CODE;
    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(code)
      .setSeverity(DiagnosticSeverity.Warning)
      .setRange(
        quoteCorrection.existingQuotationMark.startIndex,
        quoteCorrection.existingQuotationMark.endIndex,
        quoteCorrection.existingQuotationMark.enclosingRange,
      )
      .setMessage(this.getErrorMessageByCode(code))
      .setData({
        existingQuotationMark: quoteCorrection.existingQuotationMark.text,
        correctedQuotationMark: quoteCorrection.correctedQuotationMark.text,
      })
      .build();
    this.diagnosticList.addDiagnostic(diagnostic);
  }

  private addTooDeeplyNestedQuoteWarning(quotationMark: QuoteMetadata): void {
    const code: string = TOO_DEEPLY_NESTED_QUOTE_DIAGNOSTIC_CODE;
    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(code)
      .setSeverity(DiagnosticSeverity.Warning)
      .setRange(quotationMark.startIndex, quotationMark.endIndex, quotationMark.enclosingRange)
      .setMessage(this.getErrorMessageByCode(code))
      .build();
    this.diagnosticList.addDiagnostic(diagnostic);
  }
}
