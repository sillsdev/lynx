import { Document } from './document';
import { TextDocumentChange } from './text-document-change';

export interface DocumentFactory<TDoc extends Document = Document, TChange = TextDocumentChange, TContent = string> {
  create(uri: string, format: string, version: number, content: TContent): TDoc;
  update(document: TDoc, changes: readonly TChange[], version: number): TDoc;
}
