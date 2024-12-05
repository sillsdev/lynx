import { Diagnostic, DiagnosticFix, DiagnosticSeverity, DocumentManager, TextDocument } from '@sillsdev/lynx';

import { AbstractChecker } from '../abstract-checker';
import { DiagnosticFactory } from '../diagnostic-factory';
import { DiagnosticList } from '../diagnostic-list';
import { StandardFixes } from '../standard-fixes';
import { PairedPunctuationDirection } from '../utils';
import { QuotationAnalysis, QuotationAnalyzer } from './quotation-analyzer';
import { QuotationConfig } from './quotation-config';
import { QuotationDepth, QuoteCorrection, QuoteMetadata } from './quotation-utils';

const UNMATCHED_OPENING_QUOTE_DIAGNOSTIC_CODE = 'unmatched-opening-quotation-mark';
const UNMATCHED_OPENING_QUOTE_MESSAGE = 'Opening quotation mark with no closing mark.';

const UNMATCHED_CLOSING_QUOTE_DIAGNOSTIC_CODE = 'unmatched-closing-quotation-mark';
const UNMATCHED_CLOSING_QUOTE_MESSAGE = 'Closing quotation mark with no opening mark.';

const INCORRECTLY_NESTED_QUOTE_DIAGNOSTIC_CODE = 'incorrectly-nested-quotation-mark-level-';
const INCORRECTLY_NESTED_QUOTE_DIAGNOSTIC_CODE_REGEX = /incorrectly-nested-quotation-mark-level-(\d+)/;
const INCORRECTLY_NESTED_QUOTE_MESSAGE = 'Incorrectly nested quotation mark.';

const AMBIGUOUS_QUOTE_DIAGNOSTIC_CODE = 'ambiguous-quotation-mark-';
const AMBIGUOUS_QUOTE_DIAGNOSTIC_CODE_REGEX = /ambiguous-quotation-mark-(.)-to-(.)/;
const AMBIGUOUS_QUOTE_MESSAGE = 'This quotation mark is ambiguous.';

const TOO_DEEPLY_NESTED_QUOTE_DIAGNOSTIC_CODE = 'deeply-nested-quotation-mark';
const TOO_DEEPLY_NESTED_QUOTE_MESSAGE = 'Too many levels of quotation marks. Consider rephrasing to avoid this.';

export class QuotationChecker extends AbstractChecker {
  constructor(
    documentManager: DocumentManager<TextDocument>,
    private readonly quotationConfig: QuotationConfig,
  ) {
    super('quotation-mark-checker', documentManager);
  }

  protected validateTextDocument(textDocument: TextDocument): Diagnostic[] {
    const diagnosticFactory: DiagnosticFactory = new DiagnosticFactory(this.id, textDocument);

    const quotationErrorFinder: QuotationErrorFinder = new QuotationErrorFinder(
      this.quotationConfig,
      diagnosticFactory,
    );
    return quotationErrorFinder.produceDiagnostics(textDocument.getText());
  }
  protected getFixes(_textDocument: TextDocument, diagnostic: Diagnostic): DiagnosticFix[] {
    if (diagnostic.code === UNMATCHED_OPENING_QUOTE_DIAGNOSTIC_CODE) {
      return [StandardFixes.punctuationRemovalFix(diagnostic)];
    }
    if (diagnostic.code === UNMATCHED_CLOSING_QUOTE_DIAGNOSTIC_CODE) {
      return [StandardFixes.punctuationRemovalFix(diagnostic)];
    }

    if (typeof diagnostic.code === 'string' && diagnostic.code.startsWith(INCORRECTLY_NESTED_QUOTE_DIAGNOSTIC_CODE)) {
      const fixes: DiagnosticFix[] = [StandardFixes.punctuationRemovalFix(diagnostic)];
      const expectedQuotationMark: string | undefined = this.getExpectedQuotationMarkFromIncorrectlyNestedCode(
        diagnostic.code,
      );
      if (expectedQuotationMark !== undefined) {
        fixes.push(StandardFixes.punctuationReplacementFix(diagnostic, expectedQuotationMark));
      }

      return fixes;
    }

    if (typeof diagnostic.code === 'string' && diagnostic.code.startsWith(AMBIGUOUS_QUOTE_DIAGNOSTIC_CODE)) {
      const expectedQuotationMark: string | undefined = this.getExpectedQuotationMarkFromAmbiguousCode(diagnostic.code);
      if (expectedQuotationMark !== undefined) {
        return [StandardFixes.punctuationReplacementFix(diagnostic, expectedQuotationMark)];
      }
    }
    return [];
  }

  private getExpectedQuotationMarkFromIncorrectlyNestedCode(code: string): string | undefined {
    const match: RegExpMatchArray | null = INCORRECTLY_NESTED_QUOTE_DIAGNOSTIC_CODE_REGEX.exec(code);
    if (match !== null) {
      const expectedQuotationDepth = Number(match[1]) + 1;
      return this.quotationConfig.getUnambiguousQuotationMarkByType(
        QuotationDepth.fromNumber(expectedQuotationDepth),
        PairedPunctuationDirection.Opening,
      );
    }
    return this.quotationConfig.getUnambiguousQuotationMarkByType(
      QuotationDepth.Primary,
      PairedPunctuationDirection.Opening,
    );
  }

  private getExpectedQuotationMarkFromAmbiguousCode(code: string): string | undefined {
    const match: RegExpMatchArray | null = AMBIGUOUS_QUOTE_DIAGNOSTIC_CODE_REGEX.exec(code);
    if (match !== null) {
      return match[2];
    }
    return undefined;
  }
}

class QuotationErrorFinder {
  private diagnosticList: DiagnosticList;

  constructor(
    private readonly quotationConfig: QuotationConfig,
    private readonly diagnosticFactory: DiagnosticFactory,
  ) {
    this.diagnosticList = new DiagnosticList();
  }

  private reset(): void {
    this.diagnosticList = new DiagnosticList();
  }

  public produceDiagnostics(text: string): Diagnostic[] {
    this.reset();
    const quotationAnalyzer: QuotationAnalyzer = new QuotationAnalyzer(this.quotationConfig);
    const analysis: QuotationAnalysis = quotationAnalyzer.analyze(text);

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
    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(INCORRECTLY_NESTED_QUOTE_DIAGNOSTIC_CODE + (quotationMark.parentDepth?.asNumber().toFixed() ?? '0'))
      .setSeverity(DiagnosticSeverity.Warning)
      .setRange(quotationMark.startIndex, quotationMark.endIndex)
      .setMessage(INCORRECTLY_NESTED_QUOTE_MESSAGE)
      .build();

    this.diagnosticList.addDiagnostic(diagnostic);
  }

  private addUnmatchedQuoteError(quotationMark: QuoteMetadata): void {
    if (quotationMark.direction === PairedPunctuationDirection.Opening) {
      this.addUnmatchedOpeningQuoteError(quotationMark);
    } else if (quotationMark.direction === PairedPunctuationDirection.Closing) {
      this.addUnmatchedClosingQuoteError(quotationMark);
    }
  }

  private addUnmatchedOpeningQuoteError(quotationMark: QuoteMetadata): void {
    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(UNMATCHED_OPENING_QUOTE_DIAGNOSTIC_CODE)
      .setSeverity(DiagnosticSeverity.Error)
      .setRange(quotationMark.startIndex, quotationMark.endIndex)
      .setMessage(UNMATCHED_OPENING_QUOTE_MESSAGE)
      .build();
    this.diagnosticList.addDiagnostic(diagnostic);
  }

  private addUnmatchedClosingQuoteError(quotationMark: QuoteMetadata): void {
    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(UNMATCHED_CLOSING_QUOTE_DIAGNOSTIC_CODE)
      .setSeverity(DiagnosticSeverity.Error)
      .setRange(quotationMark.startIndex, quotationMark.endIndex)
      .setMessage(UNMATCHED_CLOSING_QUOTE_MESSAGE)
      .build();
    this.diagnosticList.addDiagnostic(diagnostic);
  }

  private addAmbiguousQuoteWarning(quoteCorrection: QuoteCorrection): void {
    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(
        AMBIGUOUS_QUOTE_DIAGNOSTIC_CODE +
          quoteCorrection.existingQuotationMark.text +
          '-to-' +
          quoteCorrection.correctedQuotationMark.text,
      )
      .setSeverity(DiagnosticSeverity.Warning)
      .setRange(quoteCorrection.existingQuotationMark.startIndex, quoteCorrection.existingQuotationMark.endIndex)
      .setMessage(AMBIGUOUS_QUOTE_MESSAGE)
      .build();
    this.diagnosticList.addDiagnostic(diagnostic);
  }

  private addTooDeeplyNestedQuoteWarning(quotationMark: QuoteMetadata): void {
    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(TOO_DEEPLY_NESTED_QUOTE_DIAGNOSTIC_CODE)
      .setSeverity(DiagnosticSeverity.Warning)
      .setRange(quotationMark.startIndex, quotationMark.endIndex)
      .setMessage(TOO_DEEPLY_NESTED_QUOTE_MESSAGE)
      .build();
    this.diagnosticList.addDiagnostic(diagnostic);
  }
}

export const _privateTestingClasses = {
  QuotationErrorFinder,
};
