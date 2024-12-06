import { Diagnostic } from './diagnostic';

export interface DiagnosticFix {
  title: string;
  diagnostic: Diagnostic;
  isPreferred?: boolean;
  edits: unknown[];
}
