import { DocumentFactory, TextDocumentChange } from '@sillsdev/lynx';
import { UsfmStylesheet } from '@sillsdev/machine/corpora';

import { UsfmDocument } from './usfm-document';

export class UsfmDocumentFactory implements DocumentFactory<UsfmDocument> {
  constructor(private readonly styleSheet: UsfmStylesheet) {}

  create(uri: string, format: string, version: number, content: string): UsfmDocument {
    return new UsfmDocument(uri, format, version, content, this.styleSheet);
  }

  update(document: UsfmDocument, changes: TextDocumentChange[], version: number): UsfmDocument {
    document.update(changes, version);
    return document;
  }
}
