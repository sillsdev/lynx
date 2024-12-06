import { DocumentFactory } from '@sillsdev/lynx';
import Delta, { Op } from 'quill-delta';

import { DeltaDocument } from './delta-document';

export class DeltaDocumentFactory implements DocumentFactory<DeltaDocument> {
  create(uri: string, format: string, version: number, content: Delta): DeltaDocument {
    return new DeltaDocument(uri, format, version, content);
  }

  update(document: DeltaDocument, changes: readonly Op[], version: number): DeltaDocument {
    document.update(changes, version);
    return document;
  }
}
