import { Observable } from 'rxjs';

import { Document } from '../document/document';
import { DocumentManager } from '../document/document-manager';
import { Diagnostic } from './diagnostic';

export type DiagnosticProviderFactory<T extends Document> = (DocumentManager: DocumentManager<T>) => DiagnosticProvider;

export interface DiagnosticsChanged {
  uri: string;
  version?: number;
  diagnostics: Diagnostic[];
}

export interface DiagnosticProvider {
  readonly diagnosticsChanged$: Observable<DiagnosticsChanged>;
  getDiagnostics(uri: string): Diagnostic[];
}
