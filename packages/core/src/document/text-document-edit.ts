import { Range } from '../common/range';

export interface TextDocumentEdit {
  range: Range;
  newText: string;
}
