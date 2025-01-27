import { DocumentChanges, DocumentData } from './document';
import { DocumentFactory } from './document-factory';
import { TextDocument } from './text-document';

export class TextDocumentFactory implements DocumentFactory<TextDocument> {
  create(uri: string, data: DocumentData): TextDocument {
    return new TextDocument(uri, data.format, data.version, data.content);
  }

  update(document: TextDocument, changes: DocumentChanges): TextDocument {
    document.update(changes.contentChanges, changes.version);
    return document;
  }
}
