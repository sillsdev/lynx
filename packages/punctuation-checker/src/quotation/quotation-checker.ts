import {
  Diagnostic,
  DiagnosticFix,
  DiagnosticSeverity,
  DocumentManager,
  Localizer,
  TextDocument,
} from '@sillsdev/lynx';

import { AbstractChecker } from '../abstract-checker';
import { DiagnosticFactory } from '../diagnostic-factory';
import { DiagnosticList } from '../diagnostic-list';
import { StandardFixProvider } from '../fixes/standard-fixes';
import { PairedPunctuationDirection } from '../utils';
import { QuotationAnalysis, QuotationAnalyzer } from './quotation-analyzer';
import { QuotationConfig } from './quotation-config';
import { QuotationDepth, QuoteCorrection, QuoteMetadata } from './quotation-utils';

const LOCALIZER_NAMESPACE = 'quotation';

const UNMATCHED_OPENING_QUOTE_DIAGNOSTIC_CODE = 'unmatched-opening-quotation-mark';
const UNMATCHED_CLOSING_QUOTE_DIAGNOSTIC_CODE = 'unmatched-closing-quotation-mark';
const INCORRECTLY_NESTED_QUOTE_DIAGNOSTIC_CODE = 'incorrectly-nested-quotation-mark-level-';
const INCORRECTLY_NESTED_QUOTE_DIAGNOSTIC_CODE_REGEX = /incorrectly-nested-quotation-mark-level-(\d+)/;
const AMBIGUOUS_QUOTE_DIAGNOSTIC_CODE = 'ambiguous-quotation-mark-';
const AMBIGUOUS_QUOTE_DIAGNOSTIC_CODE_REGEX = /ambiguous-quotation-mark-(.)-to-(.)/;
const TOO_DEEPLY_NESTED_QUOTE_DIAGNOSTIC_CODE = 'deeply-nested-quotation-mark';

export class QuotationChecker extends AbstractChecker {
  private readonly standardFixProvider: StandardFixProvider;

  constructor(
    localizer: Localizer,
    documentManager: DocumentManager<TextDocument>,
    private readonly quotationConfig: QuotationConfig,
  ) {
    super('quotation-mark-checker', localizer, documentManager);
    this.standardFixProvider = new StandardFixProvider(localizer);
  }

  async init(): Promise<void> {
    await super.init();

    // Ideally, we'd like to be able to inject an initialization function, so that
    // tests can provide different messages, but due to the way variable dynamic imports
    // work, the namespace loading function can only appear in this file at this location
    if (!this.localizer.hasNamespace(LOCALIZER_NAMESPACE)) {
      this.localizer.addNamespace(
        LOCALIZER_NAMESPACE,
        (language: string) => import(`./locales/${language}.json`, { with: { type: 'json' } }),
      );
    }

    this.standardFixProvider.init();
  }

  protected validateTextDocument(textDocument: TextDocument): Diagnostic[] {
    const diagnosticFactory: DiagnosticFactory = new DiagnosticFactory(this.id, textDocument);

    const quotationErrorFinder: QuotationErrorFinder = new QuotationErrorFinder(
      this.localizer,
      this.quotationConfig,
      diagnosticFactory,
    );
    return quotationErrorFinder.produceDiagnostics(textDocument.getText());
  }
  protected getFixes(_textDocument: TextDocument, diagnostic: Diagnostic): DiagnosticFix[] {
    if (diagnostic.code === UNMATCHED_OPENING_QUOTE_DIAGNOSTIC_CODE) {
      return [this.standardFixProvider.punctuationRemovalFix(diagnostic)];
    }
    if (diagnostic.code === UNMATCHED_CLOSING_QUOTE_DIAGNOSTIC_CODE) {
      return [this.standardFixProvider.punctuationRemovalFix(diagnostic)];
    }

    if (typeof diagnostic.code === 'string' && diagnostic.code.startsWith(INCORRECTLY_NESTED_QUOTE_DIAGNOSTIC_CODE)) {
      const fixes: DiagnosticFix[] = [this.standardFixProvider.punctuationRemovalFix(diagnostic)];
      const expectedQuotationMark: string | undefined = this.getExpectedQuotationMarkFromIncorrectlyNestedCode(
        diagnostic.code,
      );
      if (expectedQuotationMark !== undefined) {
        fixes.push(this.standardFixProvider.punctuationReplacementFix(diagnostic, expectedQuotationMark));
      }

      return fixes;
    }

    if (typeof diagnostic.code === 'string' && diagnostic.code.startsWith(AMBIGUOUS_QUOTE_DIAGNOSTIC_CODE)) {
      const expectedQuotationMark: string | undefined = this.getExpectedQuotationMarkFromAmbiguousCode(diagnostic.code);
      if (expectedQuotationMark !== undefined) {
        return [this.standardFixProvider.punctuationReplacementFix(diagnostic, expectedQuotationMark)];
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
    private readonly localizer: Localizer,
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
    const code: string = INCORRECTLY_NESTED_QUOTE_DIAGNOSTIC_CODE;

    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(code + (quotationMark.parentDepth?.asNumber().toFixed() ?? '0'))
      .setSeverity(DiagnosticSeverity.Warning)
      .setRange(quotationMark.startIndex, quotationMark.endIndex)
      .setMessage(this.getErrorMessageByCode(code))
      .build();

    this.diagnosticList.addDiagnostic(diagnostic);
  }

  private getErrorMessageByCode(errorCode: string): string {
    return this.localizer.t(`diagnosticMessagesByCode.${errorCode}`, {
      ns: LOCALIZER_NAMESPACE,
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
      .setRange(quotationMark.startIndex, quotationMark.endIndex)
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
      .setRange(quotationMark.startIndex, quotationMark.endIndex)
      .setMessage(this.getErrorMessageByCode(code))
      .build();
    this.diagnosticList.addDiagnostic(diagnostic);
  }

  private addAmbiguousQuoteWarning(quoteCorrection: QuoteCorrection): void {
    const code: string = AMBIGUOUS_QUOTE_DIAGNOSTIC_CODE;
    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(code + quoteCorrection.existingQuotationMark.text + '-to-' + quoteCorrection.correctedQuotationMark.text)
      .setSeverity(DiagnosticSeverity.Warning)
      .setRange(quoteCorrection.existingQuotationMark.startIndex, quoteCorrection.existingQuotationMark.endIndex)
      .setMessage(this.getErrorMessageByCode(code))
      .build();
    this.diagnosticList.addDiagnostic(diagnostic);
  }

  private addTooDeeplyNestedQuoteWarning(quotationMark: QuoteMetadata): void {
    const code: string = TOO_DEEPLY_NESTED_QUOTE_DIAGNOSTIC_CODE;
    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(code)
      .setSeverity(DiagnosticSeverity.Warning)
      .setRange(quotationMark.startIndex, quotationMark.endIndex)
      .setMessage(this.getErrorMessageByCode(code))
      .build();
    this.diagnosticList.addDiagnostic(diagnostic);
  }
}

export const _privateTestingClasses = {
  QuotationErrorFinder,
};
