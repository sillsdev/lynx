import { Diagnostic, DiagnosticFix, DiagnosticProviderFactory, DiagnosticSeverity, DocumentManager } from 'lynx-core';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { AbstractChecker, BasicCheckerConfig } from './abstract-checker';
import { DiagnosticFactory } from './diagnostic-factory';
import { DiagnosticList } from './diagnostic-list';
import { StandardFixes } from './standard-fixes';

export class ExamplePunctuationChecker extends AbstractChecker {
  static factory(config: () => BasicCheckerConfig): DiagnosticProviderFactory<TextDocument> {
    return (documentManager: DocumentManager<TextDocument>) => new ExamplePunctuationChecker(documentManager, config);
  }

  constructor(documentManager: DocumentManager<TextDocument>, config: () => BasicCheckerConfig) {
    super('example-punctuation-checker', documentManager, config);
  }

  protected validateTextDocument(textDocument: TextDocument): Diagnostic[] {
    const settings: BasicCheckerConfig = this.config();
    const diagnosticFactory: DiagnosticFactory = new DiagnosticFactory(this.id, textDocument);

    const quotationErrorFinder: QuotationErrorFinder = new QuotationErrorFinder(settings, diagnosticFactory);
    return quotationErrorFinder.produceDiagnostics(textDocument);
  }

  protected getFixes(_textDocument: TextDocument, diagnostic: Diagnostic): DiagnosticFix[] {
    if (diagnostic.code === 1) {
      return [StandardFixes.punctuationRemovalFix(diagnostic)];
    }
    return [];
  }
}

interface QuoteMetadata {
  depth: QuotationDepth;
  direction: QuotationDirection;
  startIndex: number;
  endIndex: number;
}

enum QuotationDepth {
  Primary = 1,
  Secondary = 2,
  Tertiary = 3,
}

enum QuotationDirection {
  Opening = 1,
  Closing = 2,
  Unknown = 3,
}

class QuotationErrorFinder {
  private quoteStack: QuoteMetadata[] = [];
  private diagnosticList: DiagnosticList;

  constructor(
    private readonly settings: BasicCheckerConfig,
    private readonly diagnosticFactory: DiagnosticFactory,
  ) {
    this.diagnosticList = new DiagnosticList(settings);
  }

  private reset(): void {
    this.quoteStack = [];
    this.diagnosticList = new DiagnosticList(this.settings);
  }

  public produceDiagnostics(textDocument: TextDocument): Diagnostic[] {
    this.reset();

    this.processAllQuotationMarks(textDocument);
    this.handleUnmatchedQuotationMarks();

    return this.diagnosticList.toArray();
  }

  private processAllQuotationMarks(textDocument: TextDocument): void {
    const text = textDocument.getText();
    const quotationIterator: QuotationIterator = new QuotationIterator(text);
    while (quotationIterator.hasNext() && !this.diagnosticList.isProblemThresholdReached()) {
      this.processQuotationMark(quotationIterator.next());
    }
  }

  private processQuotationMark(quotationMark: QuoteMetadata): void {
    if (quotationMark.direction === QuotationDirection.Opening) {
      this.processOpeningQuotationMark(quotationMark);
    } else if (quotationMark.direction === QuotationDirection.Closing) {
      this.processClosingQuotationMark(quotationMark);
    }
  }

  private processOpeningQuotationMark(quotationMark: QuoteMetadata): void {
    if (this.quoteStack.length > 0) {
      this.addNestedQuoteError(quotationMark);
    }
    this.quoteStack.push(quotationMark);
  }

  private processClosingQuotationMark(quotationMark: QuoteMetadata): void {
    if (this.quoteStack.length === 0) {
      this.addUnmatchedClosingQuoteError(quotationMark);
    } else {
      this.quoteStack.pop();
    }
  }

  private handleUnmatchedQuotationMarks(): void {
    let quotationMark: QuoteMetadata | undefined;
    while ((quotationMark = this.quoteStack.pop())) {
      this.addUnmatchedOpeningQuoteError(quotationMark);
    }
  }

  private addNestedQuoteError(quotationMark: QuoteMetadata): void {
    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(1)
      .setSeverity(DiagnosticSeverity.Warning)
      .setRange(quotationMark.startIndex, quotationMark.endIndex)
      .setMessage(`Primary opening quote nested inside another primary quote.`)
      .build();

    this.diagnosticList.addDiagnostic(diagnostic);
  }

  private addUnmatchedOpeningQuoteError(quotationMark: QuoteMetadata): void {
    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(1)
      .setSeverity(DiagnosticSeverity.Error)
      .setRange(quotationMark.startIndex, quotationMark.endIndex)
      .setMessage(`Opening quote with no closing quote.`)
      .build();
    this.diagnosticList.addDiagnostic(diagnostic);
  }

  private addUnmatchedClosingQuoteError(quotationMark: QuoteMetadata): void {
    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(1)
      .setSeverity(DiagnosticSeverity.Error)
      .setRange(quotationMark.startIndex, quotationMark.endIndex)
      .setMessage(`Closing quote with no opening quote.`)
      .build();
    this.diagnosticList.addDiagnostic(diagnostic);
  }
}

class QuotationIterator {
  private readonly openingQuotePattern: RegExp = /\u201C/;
  private readonly closingQuotePattern: RegExp = /\u201D/;
  private readonly openingOrClosingQuotePattern: RegExp = /[\u201C\u201D]/g;
  private nextQuote: QuoteMetadata | null = null;

  constructor(private readonly text: string) {
    this.findNext();
  }

  private findNext(): void {
    const match: RegExpExecArray | null = this.openingOrClosingQuotePattern.exec(this.text);
    if (match === null) {
      this.nextQuote = null;
      return;
    }
    const matchingText = match[0];
    const direction = this.findQuoteDirection(matchingText);
    if (direction === undefined) {
      throw new Error(`Unrecognized quote direction for ${matchingText}`);
    }
    this.nextQuote = {
      depth: QuotationDepth.Primary,
      direction: direction,
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    };
  }

  public hasNext(): boolean {
    return this.nextQuote !== null;
  }

  public next(): QuoteMetadata {
    const quoteToReturn = this.nextQuote;
    if (quoteToReturn === null) {
      throw new Error(`QuoteIterator's next() function called after hasNext() returned false`);
    }
    this.findNext();
    return quoteToReturn;
  }

  private findQuoteDirection(quotationMark: string): QuotationDirection | undefined {
    if (this.openingQuotePattern.test(quotationMark)) {
      return QuotationDirection.Opening;
    } else if (this.closingQuotePattern.test(quotationMark)) {
      return QuotationDirection.Closing;
    }
    return undefined;
  }
}
