import { DocumentFactory } from './document-factory';
import { TextDocument } from './text-document';
import { TextDocumentChange } from './text-document-change';

export class TextDocumentFactory implements DocumentFactory<TextDocument> {
  create(uri: string, format: string, version: number, content: string): TextDocument {
    return new TextDocument(uri, format, version, content);
  }

  update(document: TextDocument, changes: TextDocumentChange[], version: number): TextDocument {
    document.update(changes, version);
    return document;
  }
}
