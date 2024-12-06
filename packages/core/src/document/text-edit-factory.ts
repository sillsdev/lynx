import { Range } from '../common/range';
import { TextEdit } from '../common/text-edit';
import { EditFactory } from './edit-factory';
import { TextDocument } from './text-document';

export class TextEditFactory<T extends TextDocument = TextDocument> implements EditFactory<T> {
  createTextEdit(_document: T, range: Range, newText: string): TextEdit[] {
    return [{ range, newText }];
  }
}
