import {
  DocumentAccessor,
  EditFactory,
  OnTypeFormattingProvider,
  Position,
  ScriptureDocument,
  TextDocument,
  TextEdit,
} from '@sillsdev/lynx';

import { CheckableGroup, TextDocumentCheckable } from '../checkable';
import { ScriptureTextNodeGrouper } from '../scripture-grouper';
import { isScriptureDocument } from '../utils';
import { QuotationAnalysis, QuotationAnalyzer } from './quotation-analyzer';
import { QuotationConfig } from './quotation-config';

export class QuotationCorrector<TDoc extends TextDocument | ScriptureDocument, TEdit = TextEdit>
  implements OnTypeFormattingProvider<TEdit>
{
  readonly id = 'quote-corrector';
  readonly onTypeTriggerCharacters: ReadonlySet<string>;

  constructor(
    private readonly documentManager: DocumentAccessor<TDoc>,
    private readonly editFactory: EditFactory<TDoc, TEdit>,
    private readonly quotationConfig: QuotationConfig,
  ) {
    this.onTypeTriggerCharacters = this.quotationConfig.createAmbiguousQuotationMarkSet();
  }

  public init(): Promise<void> {
    return Promise.resolve();
  }

  public async getOnTypeEdits(uri: string, _position: Position, _ch: string): Promise<TEdit[] | undefined> {
    const doc = await this.documentManager.get(uri);
    if (doc == null) {
      return undefined;
    }

    return this.correctDocument(doc);
  }

  private correctDocument(doc: TDoc): TEdit[] | PromiseLike<TEdit[] | undefined> | undefined {
    if (isScriptureDocument(doc)) {
      return this.correctScriptureDocument(doc);
    }
    return this.correctTextDocument(doc);
  }

  private correctScriptureDocument(
    scriptureDocument: ScriptureDocument,
  ): TEdit[] | PromiseLike<TEdit[] | undefined> | undefined {
    const quotationAnalyzer: QuotationAnalyzer = new QuotationAnalyzer(this.quotationConfig);
    const scriptureNodeGrouper: ScriptureTextNodeGrouper = new ScriptureTextNodeGrouper(scriptureDocument);

    let edits: TEdit[] = [];
    for (const checkableGroup of scriptureNodeGrouper.getCheckableGroups()) {
      edits = edits.concat(this.correctScriptureNodes(scriptureDocument, quotationAnalyzer, checkableGroup));
    }

    return edits;
  }

  private correctScriptureNodes(
    scriptureDocument: ScriptureDocument,
    quotationAnalyzer: QuotationAnalyzer,
    checkableGroup: CheckableGroup,
  ): TEdit[] {
    const quotationAnalysis: QuotationAnalysis = quotationAnalyzer.analyze(checkableGroup);
    const edits: TEdit[] = [];

    for (const quoteCorrection of quotationAnalysis.getAmbiguousQuoteCorrections()) {
      edits.push(
        ...this.editFactory.createTextEdit(
          scriptureDocument as TDoc,
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

  private correctTextDocument(textDocument: TextDocument): TEdit[] | PromiseLike<TEdit[] | undefined> | undefined {
    const quotationAnalyzer: QuotationAnalyzer = new QuotationAnalyzer(this.quotationConfig);
    const quotationAnalysis: QuotationAnalysis = quotationAnalyzer.analyze(
      new CheckableGroup([new TextDocumentCheckable(textDocument.getText())]),
    );

    const edits: TEdit[] = [];
    for (const quoteCorrection of quotationAnalysis.getAmbiguousQuoteCorrections()) {
      edits.push(
        ...this.editFactory.createTextEdit(
          textDocument as TDoc,
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
