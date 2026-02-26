import { TextEdit } from '../common/text-edit';
import { Diagnostic } from './diagnostic';

export interface DiagnosticAction<T = TextEdit> {
  title: string;
  diagnostic: Diagnostic;
  isPreferred?: boolean;
  edits?: T[];
  command?: string;
}
