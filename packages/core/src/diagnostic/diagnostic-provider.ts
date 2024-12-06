import { Observable } from 'rxjs';

import { TextEdit } from '../common/text-edit';
import { Diagnostic } from './diagnostic';
import { DiagnosticFix } from './diagnostic-fix';

export interface DiagnosticsChanged {
  uri: string;
  version?: number;
  diagnostics: Diagnostic[];
}

export interface DiagnosticProvider<T = TextEdit> {
  readonly id: string;
  readonly diagnosticsChanged$: Observable<DiagnosticsChanged>;
  init(): Promise<void>;
  getDiagnostics(uri: string): Promise<Diagnostic[]>;
  getDiagnosticFixes(uri: string, diagnostic: Diagnostic): Promise<DiagnosticFix<T>[]>;
}
