import { DocumentFactory, TextDocumentChange } from '@sillsdev/lynx';
import { UsfmStylesheet } from '@sillsdev/machine/corpora';

import { UsfmDocument } from './usfm-document';

export class UsfmDocumentFactory implements DocumentFactory<UsfmDocument> {
  constructor(private readonly styleSheet: UsfmStylesheet) {}

  create(uri: string, format: string, version: number, content: string): UsfmDocument {
    if (format !== 'usfm') {
      throw new Error(`This factory does not support the format '${format}'.`);
    }
    return new UsfmDocument(uri, version, content, this.styleSheet);
  }

  update(document: UsfmDocument, changes: readonly TextDocumentChange[], version: number): UsfmDocument {
    document.update(changes, version);
    return document;
  }
}
