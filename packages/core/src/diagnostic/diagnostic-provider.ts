import { Observable } from 'rxjs';

import { Diagnostic } from './diagnostic';
import { DiagnosticFix } from './diagnostic-fix';

export interface DiagnosticsChanged {
  uri: string;
  version?: number;
  diagnostics: Diagnostic[];
}

export interface DiagnosticProvider {
  readonly id: string;
  readonly diagnosticsChanged$: Observable<DiagnosticsChanged>;
  getDiagnostics(uri: string): Promise<Diagnostic[]>;
  getDiagnosticFixes(uri: string, diagnostic: Diagnostic): Promise<DiagnosticFix[]>;
}
