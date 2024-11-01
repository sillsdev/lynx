import { Observable } from 'rxjs';

import { Document } from '../document/document';
import { DocumentManager } from '../document/document-manager';
import { Diagnostic } from './diagnostic';
import { DiagnosticFix } from './diagnostic-fix';

export type DiagnosticProviderFactory<T extends Document = Document> = (
  DocumentManager: DocumentManager<T>,
) => DiagnosticProvider;
export type DiagnosticProviderConstructor<T extends Document = Document> = new (
  documentManager: DocumentManager<T>,
) => DiagnosticProvider;

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
