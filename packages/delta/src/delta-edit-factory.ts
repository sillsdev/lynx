import { EditFactory } from '@sillsdev/lynx';
import { Op } from 'quill-delta';

import { DeltaDocument } from './delta-document';

export class DeltaEditFactory implements EditFactory<DeltaDocument, Op> {
  createTextEdit(_document: DeltaDocument, startOffset: number, endOffset: number, newText: string): Op[] {
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
