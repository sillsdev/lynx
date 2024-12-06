import { DocumentFactory } from '@sillsdev/lynx';
import Delta, { Op } from 'quill-delta';

import { DeltaDocument } from './delta-document';

export class DeltaDocumentFactory implements DocumentFactory<DeltaDocument, Op, Delta | string> {
  create(uri: string, format: string, version: number, content: Delta | string): DeltaDocument {
    if (typeof content === 'string') {
      content = new Delta(JSON.parse(content));
    }
    return new DeltaDocument(uri, format, version, content);
  }

  update(document: DeltaDocument, changes: Op[], version: number): DeltaDocument {
    document.update(changes, version);
    return document;
  }
}
