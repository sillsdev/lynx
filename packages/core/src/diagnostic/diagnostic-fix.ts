import { Range } from '../common/range';
import { Diagnostic } from './diagnostic';

export interface TextEdit {
  range: Range;
  newText: string;
}

export interface DiagnosticFix {
  title: string;
  diagnostic: Diagnostic;
  isPreferred?: boolean;
  edits: TextEdit[];
}
