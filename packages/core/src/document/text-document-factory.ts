import { DocumentChange, DocumentFactory } from './document-factory';
import { TextDocument } from './text-document';

export class TextDocumentFactory implements DocumentFactory<TextDocument> {
  create(uri: string, _format: string, version: number, content: string): TextDocument {
    return new TextDocument(uri, version, content);
  }

  update(document: TextDocument, changes: readonly DocumentChange[], version: number): TextDocument {
    document.update(changes, version);
    return document;
  }
}
