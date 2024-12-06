import { TextEdit } from '../common/text-edit';
import { EditFactory } from './edit-factory';
import { TextDocument } from './text-document';

export class TextEditFactory<T extends TextDocument = TextDocument> implements EditFactory<T> {
  createTextEdit(document: TextDocument, startOffset: number, endOffset: number, newText: string): TextEdit[] {
    return [{ range: { start: document.positionAt(startOffset), end: document.positionAt(endOffset) }, newText }];
  }
}
