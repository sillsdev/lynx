import { TextEdit } from '../common/text-edit';
import { Diagnostic } from '../diagnostic/diagnostic';
import { DiagnosticAction } from '../diagnostic/diagnostic-action';

export interface WorkspaceAccessor<T = TextEdit> {
  getDiagnostics(uri: string): Promise<Diagnostic[]>;
  getDiagnosticActions(uri: string, diagnostic: Diagnostic): Promise<DiagnosticAction<T>[]>;
  dismissDiagnostic(uri: string, diagnostic: Diagnostic): Promise<boolean>;
  executeDiagnosticActionCommand(command: string, uri: string, diagnostic: Diagnostic): Promise<boolean>;
}
