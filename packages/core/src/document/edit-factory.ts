import { Range } from '../common/range';
import { TextEdit } from '../common/text-edit';
import { Document } from './document';

export interface EditFactory<TDoc extends Document = Document, TEdit = TextEdit> {
  createTextEdit(document: TDoc, range: Range, newText: string): TEdit[];
}
