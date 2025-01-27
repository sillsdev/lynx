import { DocumentChanges, DocumentData, DocumentFactory } from '@sillsdev/lynx';
import Delta, { Op } from 'quill-delta';

import { DeltaDocument } from './delta-document';

export class DeltaDocumentFactory implements DocumentFactory<DeltaDocument, Op, Delta | string> {
  create(uri: string, data: DocumentData<Delta | string>): DeltaDocument {
    let content = data.content;
    if (typeof content === 'string') {
      content = new Delta(JSON.parse(content));
    }
    return new DeltaDocument(uri, data.format, data.version, content);
  }

  update(document: DeltaDocument, changes: DocumentChanges<Op>): DeltaDocument {
    document.update(changes.contentChanges, changes.version);
    return document;
  }
}
