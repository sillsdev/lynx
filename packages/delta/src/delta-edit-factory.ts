import { EditFactory, Range } from '@sillsdev/lynx';
import { Op } from 'quill-delta';

import { DeltaDocument } from './delta-document';

export class DeltaEditFactory<T extends DeltaDocument = DeltaDocument> implements EditFactory<T, Op> {
  createTextEdit(document: T, range: Range, newText: string): Op[] {
    const startOffset = document.offsetAt(range.start);
    const endOffset = document.offsetAt(range.end);
    const ops: Op[] = [];
    if (startOffset > 0) {
      ops.push({ retain: startOffset });
    }
    if (endOffset - startOffset > 0) {
      ops.push({ delete: endOffset - startOffset });
    }
    if (newText.length > 0) {
      ops.push({ insert: newText });
    }
    return ops;
  }
}
