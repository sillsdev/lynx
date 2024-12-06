import { TextEdit } from '../common/text-edit';
import { Diagnostic } from './diagnostic';

export interface DiagnosticFix<T = TextEdit> {
  title: string;
  diagnostic: Diagnostic;
  isPreferred?: boolean;
  edits: T[];
}
