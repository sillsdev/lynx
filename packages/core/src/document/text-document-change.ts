import { Range } from '../common/range';

export interface TextDocumentChange {
  range?: Range;
  text: string;
}
