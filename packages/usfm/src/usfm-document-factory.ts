import { DocumentChange, DocumentFactory, ScriptureDocument } from '@sillsdev/lynx';
import { UsfmStylesheet } from '@sillsdev/machine/corpora';

import { UsfmDocument } from './usfm-document';

export class UsfmDocumentFactory implements DocumentFactory<ScriptureDocument> {
  constructor(private readonly styleSheet: UsfmStylesheet) {}

  create(uri: string, format: string, version: number, content: string): ScriptureDocument {
    if (format !== 'usfm') {
      throw new Error(`This factory does not support the format '${format}'.`);
    }
    return new UsfmDocument(uri, version, content, this.styleSheet);
  }

  update(document: ScriptureDocument, changes: readonly DocumentChange[], version: number): ScriptureDocument {
    if (document instanceof UsfmDocument) {
      document.update(changes, version);
      return document;
    }
    throw new Error('The document must be created by this factory.');
  }
}
