import { Range } from './range';

export interface TextEdit {
  range: Range;
  newText: string;
}
