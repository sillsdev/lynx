import { TextEdit } from '../common/text-edit';
import { Document } from './document';

export interface EditFactory<TDoc extends Document = Document, TEdit = TextEdit> {
  createTextEdit(document: TDoc, startOffset: number, endOffset: number, newText: string): TEdit[];
}
