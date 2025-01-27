import { Document, DocumentChanges, DocumentData } from './document';
import { TextDocumentChange } from './text-document-change';

export interface DocumentFactory<TDoc extends Document = Document, TChange = TextDocumentChange, TContent = string> {
  create(uri: string, data: DocumentData<TContent>): TDoc;
  update(document: TDoc, changes: DocumentChanges<TChange>): TDoc;
}
