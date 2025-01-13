import {
  DocumentAccessor,
  EditFactory,
  OnTypeFormattingProvider,
  Position,
  ScriptureDocument,
  ScriptureNode,
  ScriptureNodeType,
  TextDocument,
  TextEdit,
} from '@sillsdev/lynx';

import { isScriptureDocument, ScriptureNodeGrouper } from '../utils';
import { QuotationAnalysis, QuotationAnalyzer } from './quotation-analyzer';
import { QuotationConfig } from './quotation-config';

export class QuotationCorrector<T extends TextDocument | ScriptureDocument> implements OnTypeFormattingProvider {
  readonly id = 'quote-corrector';
  readonly onTypeTriggerCharacters: ReadonlySet<string>;

  constructor(
    private readonly documentManager: DocumentAccessor<T>,
    private readonly editFactory: EditFactory<T>,
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

    return this.correctDocument(doc);
  }

  private correctDocument(
    doc: TextDocument | ScriptureDocument,
  ): TextEdit[] | PromiseLike<TextEdit[] | undefined> | undefined {
    if (isScriptureDocument(doc)) {
      return this.correctScriptureDocument(doc);
    }
    return this.correctTextDocument(doc);
  }

  private correctScriptureDocument(
    scriptureDocument: ScriptureDocument,
  ): TextEdit[] | PromiseLike<TextEdit[] | undefined> | undefined {
    const quotationAnalyzer: QuotationAnalyzer = new QuotationAnalyzer(this.quotationConfig);
    const scriptureNodeGrouper: ScriptureNodeGrouper = new ScriptureNodeGrouper(
      scriptureDocument.findNodes([ScriptureNodeType.Text]),
    );

    let edits: TextEdit[] = [];
    for (const nonVerseNode of scriptureNodeGrouper.getNonVerseNodes()) {
      edits = edits.concat(this.correctScriptureNodes(scriptureDocument, quotationAnalyzer, [nonVerseNode]));
    }
    edits = edits.concat(
      this.correctScriptureNodes(scriptureDocument, quotationAnalyzer, scriptureNodeGrouper.getVerseNodes()),
    );

    return edits;
  }

  private correctScriptureNodes(
    scriptureDocument: ScriptureDocument,
    quotationAnalyzer: QuotationAnalyzer,
    scriptureNodes: ScriptureNode[],
  ): TextEdit[] {
    const quotationAnalysis: QuotationAnalysis = quotationAnalyzer.analyze(scriptureNodes);
    const edits: TextEdit[] = [];

    for (const quoteCorrection of quotationAnalysis.getAmbiguousQuoteCorrections()) {
      edits.push(
        ...this.editFactory.createTextEdit(
          scriptureDocument as T,
          {
            start: scriptureDocument.positionAt(
              quoteCorrection.existingQuotationMark.startIndex,
              quoteCorrection.existingQuotationMark.enclosingRange,
            ),
            end: scriptureDocument.positionAt(
              quoteCorrection.existingQuotationMark.endIndex,
              quoteCorrection.existingQuotationMark.enclosingRange,
            ),
          },
          quoteCorrection.correctedQuotationMark.text,
        ),
      );
    }

    return edits;
  }

  private correctTextDocument(
    textDocument: TextDocument,
  ): TextEdit[] | PromiseLike<TextEdit[] | undefined> | undefined {
    const quotationAnalyzer: QuotationAnalyzer = new QuotationAnalyzer(this.quotationConfig);
    const quotationAnalysis: QuotationAnalysis = quotationAnalyzer.analyze(textDocument.getText());

    const edits: TextEdit[] = [];
    for (const quoteCorrection of quotationAnalysis.getAmbiguousQuoteCorrections()) {
      edits.push(
        ...this.editFactory.createTextEdit(
          textDocument as T,
          {
            start: textDocument.positionAt(quoteCorrection.existingQuotationMark.startIndex),
            end: textDocument.positionAt(quoteCorrection.existingQuotationMark.endIndex),
          },
          quoteCorrection.correctedQuotationMark.text,
        ),
      );
    }

    if (edits.length === 0) {
      return undefined;
    }
    return edits;
  }
}
