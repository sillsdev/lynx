import { DocumentManager, OnTypeFormattingProvider, Position, TextDocument, TextEdit } from '@sillsdev/lynx';

import { QuotationAnalysis, QuotationAnalyzer } from './quotation-analyzer';
import { QuotationConfig } from './quotation-config';

export class QuotationCorrector implements OnTypeFormattingProvider {
  readonly id = 'quote-corrector';
  readonly onTypeTriggerCharacters: ReadonlySet<string>;

  constructor(
    private readonly documentManager: DocumentManager<TextDocument>,
    private readonly quotationConfig: QuotationConfig,
  ) {
    this.onTypeTriggerCharacters = this.quotationConfig.createAmbiguousQuotationMarkSet();
  }

  public init(): Promise<void> {
    return Promise.resolve();
  }

  public async getOnTypeEdits(uri: string, _position: Position, _ch: string): Promise<TextEdit[] | undefined> {
    const doc = await this.documentManager.get(uri);
    if (doc == null) {
      return undefined;
    }

    const edits: TextEdit[] = [];
    const quotationAnalyzer: QuotationAnalyzer = new QuotationAnalyzer(this.quotationConfig);
    const quotationAnalysis: QuotationAnalysis = quotationAnalyzer.analyze(doc.getText());

    for (const quoteCorrection of quotationAnalysis.getAmbiguousQuoteCorrections()) {
      edits.push({
        range: {
          start: doc.positionAt(quoteCorrection.existingQuotationMark.startIndex),
          end: doc.positionAt(quoteCorrection.existingQuotationMark.endIndex),
        },
        newText: quoteCorrection.correctedQuotationMark.text,
      });
    }

    if (edits.length === 0) {
      return undefined;
    }
    return edits;
  }
}
