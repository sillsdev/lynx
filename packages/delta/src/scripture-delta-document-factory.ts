import { DocumentFactory } from '@sillsdev/lynx';
import Delta, { Op } from 'quill-delta';

import { ScriptureDeltaDocument } from './scripture-delta-document';

export class ScriptureDeltaDocumentFactory implements DocumentFactory<ScriptureDeltaDocument, Op, Delta | string> {
  create(uri: string, format: string, version: number, content: Delta | string): ScriptureDeltaDocument {
    if (typeof content === 'string') {
      content = new Delta(JSON.parse(content));
    }
    return new ScriptureDeltaDocument(uri, format, version, content);
  }

  update(document: ScriptureDeltaDocument, changes: Op[], version: number): ScriptureDeltaDocument {
    document.update(changes, version);
    return document;
  }
}
