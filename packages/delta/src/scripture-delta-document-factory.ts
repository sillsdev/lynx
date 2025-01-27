import { DocumentChanges, DocumentData, DocumentFactory } from '@sillsdev/lynx';
import Delta, { Op } from 'quill-delta';

import { ScriptureDeltaDocument } from './scripture-delta-document';

export class ScriptureDeltaDocumentFactory implements DocumentFactory<ScriptureDeltaDocument, Op, Delta | string> {
  create(uri: string, data: DocumentData<Delta | string>): ScriptureDeltaDocument {
    let content = data.content;
    if (typeof content === 'string') {
      content = new Delta(JSON.parse(content));
    }
    return new ScriptureDeltaDocument(uri, data.format, data.version, content);
  }

  update(document: ScriptureDeltaDocument, changes: DocumentChanges<Op>): ScriptureDeltaDocument {
    document.update(changes.contentChanges, changes.version);
    return document;
  }
}
