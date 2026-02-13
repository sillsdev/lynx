import { Diagnostic, DiagnosticSeverity, Localizer } from '@sillsdev/lynx';

import { CheckableGroup } from '../checkable';
import { DiagnosticFactory } from '../diagnostic-factory';
import { DiagnosticList } from '../diagnostic-list';
import { IssueFinder, IssueFinderFactory } from '../issue-finder';
import { PairedPunctuationDirection } from '../utils';
import { MissingQuoteContinuerMetadata, QuotationAnalysis, QuotationAnalyzer } from './quotation-analyzer';
import {
  AMBIGUOUS_QUOTE_DIAGNOSTIC_CODE,
  INCORRECTLY_NESTED_QUOTE_DIAGNOSTIC_CODE,
  MISSING_QUOTE_CONTINUER_CODE,
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

  public async produceDiagnostics(checkableGroup: CheckableGroup): Promise<Diagnostic[]> {
    this.reset();
    const quotationAnalyzer: QuotationAnalyzer = new QuotationAnalyzer(this.quotationConfig);
    const analysis: QuotationAnalysis = quotationAnalyzer.analyze(checkableGroup);

    await this.createDiagnostics(analysis);
    return this.diagnosticList.toArray();
  }

  private async createDiagnostics(analysis: QuotationAnalysis): Promise<void> {
    await this.createUnmatchedQuoteDiagnostics(analysis);
    await this.createIncorrectlyNestedQuoteDiagnostics(analysis);
    await this.createAmbiguousQuoteDiagnostics(analysis);
    await this.createTooDeeplyNestedQuoteDiagnostics(analysis);
    await this.createMissingQuoteContinuerDiagnostics(analysis);
  }

  private async createUnmatchedQuoteDiagnostics(analysis: QuotationAnalysis): Promise<void> {
    for (const unmatchedQuote of analysis.getUnmatchedQuotes()) {
      await this.addUnmatchedQuoteError(unmatchedQuote);
    }
  }

  private async createIncorrectlyNestedQuoteDiagnostics(analysis: QuotationAnalysis): Promise<void> {
    for (const incorrectlyNestedQuote of analysis.getIncorrectlyNestedQuotes()) {
      await this.addIncorrectlyNestedQuoteWarning(incorrectlyNestedQuote);
    }
  }

  private async createAmbiguousQuoteDiagnostics(analysis: QuotationAnalysis): Promise<void> {
    for (const ambiguousQuote of analysis.getAmbiguousQuoteCorrections()) {
      await this.addAmbiguousQuoteWarning(ambiguousQuote);
    }
  }

  private async createTooDeeplyNestedQuoteDiagnostics(analysis: QuotationAnalysis): Promise<void> {
    for (const tooDeeplyNestedQuote of analysis.getTooDeeplyNestedQuotes()) {
      await this.addTooDeeplyNestedQuoteWarning(tooDeeplyNestedQuote);
    }
  }

  private async createMissingQuoteContinuerDiagnostics(analysis: QuotationAnalysis): Promise<void> {
    for (const missingQuoteContinuer of analysis.getMissingQuoteContinuers()) {
      await this.addMissingQuoteContinuerWarning(missingQuoteContinuer);
    }
  }

  private async addIncorrectlyNestedQuoteWarning(quotationMark: QuoteMetadata): Promise<void> {
    const code: string = INCORRECTLY_NESTED_QUOTE_DIAGNOSTIC_CODE;

    const diagnostic: Diagnostic = await this.diagnosticFactory
      .newBuilder()
      .setCode(code)
      .setSeverity(DiagnosticSeverity.Warning)
      .setRange(quotationMark.startIndex, quotationMark.endIndex, quotationMark.enclosingRange)
      .setMessage(this.getErrorMessageByCode(code))
      .setData({ depth: quotationMark.parentDepth?.asNumber() ?? 0 })
      .setVerseRef(quotationMark.verseRef)
      .setContent(quotationMark.text)
      .setLeftContext(quotationMark.leftContext)
      .setRightContext(quotationMark.rightContext)
      .build();

    this.diagnosticList.addDiagnostic(diagnostic);
  }

  private getErrorMessageByCode(errorCode: string): string {
    return this.localizer.t(`diagnosticMessagesByCode.${errorCode}`, {
      ns: QUOTATION_CHECKER_LOCALIZER_NAMESPACE,
    });
  }

  private async addUnmatchedQuoteError(quotationMark: QuoteMetadata): Promise<void> {
    if (quotationMark.direction === PairedPunctuationDirection.Opening) {
      await this.addUnmatchedOpeningQuoteError(quotationMark);
    } else if (quotationMark.direction === PairedPunctuationDirection.Closing) {
      await this.addUnmatchedClosingQuoteError(quotationMark);
    }
  }

  private async addUnmatchedOpeningQuoteError(quotationMark: QuoteMetadata): Promise<void> {
    const code: string = UNMATCHED_OPENING_QUOTE_DIAGNOSTIC_CODE;
    const diagnostic: Diagnostic = await this.diagnosticFactory
      .newBuilder()
      .setCode(code)
      .setSeverity(DiagnosticSeverity.Error)
      .setRange(quotationMark.startIndex, quotationMark.endIndex, quotationMark.enclosingRange)
      .setMessage(this.getErrorMessageByCode(code))
      .setVerseRef(quotationMark.verseRef)
      .setContent(quotationMark.text)
      .setLeftContext(quotationMark.leftContext)
      .setRightContext(quotationMark.rightContext)
      .build();
    this.diagnosticList.addDiagnostic(diagnostic);
  }

  private async addUnmatchedClosingQuoteError(quotationMark: QuoteMetadata): Promise<void> {
    const code = UNMATCHED_CLOSING_QUOTE_DIAGNOSTIC_CODE;
    const diagnostic: Diagnostic = await this.diagnosticFactory
      .newBuilder()
      .setCode(code)
      .setSeverity(DiagnosticSeverity.Error)
      .setRange(quotationMark.startIndex, quotationMark.endIndex, quotationMark.enclosingRange)
      .setMessage(this.getErrorMessageByCode(code))
      .setVerseRef(quotationMark.verseRef)
      .setContent(quotationMark.text)
      .setLeftContext(quotationMark.leftContext)
      .setRightContext(quotationMark.rightContext)
      .build();
    this.diagnosticList.addDiagnostic(diagnostic);
  }

  private async addAmbiguousQuoteWarning(ambiguousQuote: QuoteCorrection): Promise<void> {
    const code: string = AMBIGUOUS_QUOTE_DIAGNOSTIC_CODE;
    const diagnostic: Diagnostic = await this.diagnosticFactory
      .newBuilder()
      .setCode(code)
      .setSeverity(DiagnosticSeverity.Warning)
      .setRange(
        ambiguousQuote.existingQuotationMark.startIndex,
        ambiguousQuote.existingQuotationMark.endIndex,
        ambiguousQuote.existingQuotationMark.enclosingRange,
      )
      .setMessage(this.getErrorMessageByCode(code))
      .setData({
        existingQuotationMark: ambiguousQuote.existingQuotationMark.text,
        correctedQuotationMark: ambiguousQuote.correctedQuotationMark.text,
      })
      .setVerseRef(ambiguousQuote.existingQuotationMark.verseRef)
      .setContent(ambiguousQuote.existingQuotationMark.text)
      .setLeftContext(ambiguousQuote.existingQuotationMark.leftContext)
      .setRightContext(ambiguousQuote.existingQuotationMark.rightContext)
      .build();
    this.diagnosticList.addDiagnostic(diagnostic);
  }

  private async addTooDeeplyNestedQuoteWarning(quotationMark: QuoteMetadata): Promise<void> {
    const code: string = TOO_DEEPLY_NESTED_QUOTE_DIAGNOSTIC_CODE;
    const diagnostic: Diagnostic = await this.diagnosticFactory
      .newBuilder()
      .setCode(code)
      .setSeverity(DiagnosticSeverity.Warning)
      .setRange(quotationMark.startIndex, quotationMark.endIndex, quotationMark.enclosingRange)
      .setMessage(this.getErrorMessageByCode(code))
      .setVerseRef(quotationMark.verseRef)
      .setContent(quotationMark.text)
      .setLeftContext(quotationMark.leftContext)
      .setRightContext(quotationMark.rightContext)
      .build();
    this.diagnosticList.addDiagnostic(diagnostic);
  }

  private async addMissingQuoteContinuerWarning(missingQuoteContinuer: MissingQuoteContinuerMetadata): Promise<void> {
    const code: string = MISSING_QUOTE_CONTINUER_CODE;
    const diagnostic: Diagnostic = await this.diagnosticFactory
      .newBuilder()
      .setCode(code)
      .setSeverity(DiagnosticSeverity.Warning)
      .setRange(missingQuoteContinuer.startIndex, missingQuoteContinuer.endIndex, missingQuoteContinuer.enclosingRange)
      .setMessage(this.getErrorMessageByCode(code))
      .setData(missingQuoteContinuer.missingQuoteContinuers)
      .setVerseRef(missingQuoteContinuer.verseRef)
      .setContent(missingQuoteContinuer.text)
      .setLeftContext(missingQuoteContinuer.leftContext)
      .setRightContext(missingQuoteContinuer.rightContext)
      .build();
    this.diagnosticList.addDiagnostic(diagnostic);
  }
}
