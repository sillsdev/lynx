import { DocumentFactory } from '@sillsdev/lynx';
import Delta, { Op } from 'quill-delta';

import { DeltaDocument } from './delta-document';

export class DeltaDocumentFactory implements DocumentFactory<DeltaDocument, Op> {
  create(uri: string, format: string, version: number, content: string): DeltaDocument {
    return new DeltaDocument(uri, format, version, new Delta(JSON.parse(content)));
  }

  update(document: DeltaDocument, changes: readonly Op[], version: number): DeltaDocument {
    document.update(changes, version);
    return document;
  }
}
