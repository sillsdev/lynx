import { DocumentChanges, DocumentData, DocumentFactory } from '@sillsdev/lynx';
import { UsfmStylesheet } from '@sillsdev/machine/corpora';

import { UsfmDocument } from './usfm-document';

export class UsfmDocumentFactory implements DocumentFactory<UsfmDocument> {
  constructor(private readonly styleSheet: UsfmStylesheet) {}

  create(uri: string, data: DocumentData): UsfmDocument {
    return new UsfmDocument(uri, data.format, data.version, data.content, this.styleSheet);
  }

  update(document: UsfmDocument, changes: DocumentChanges): UsfmDocument {
    document.update(changes.contentChanges, changes.version);
    return document;
  }
}
