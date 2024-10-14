import {
    Diagnostic,
    DiagnosticProvider,
    DiagnosticProviderFactory,
    DiagnosticsChanged,
    DiagnosticSeverity,
    DocumentManager,
  } from 'lynx-core';
import { DiagnosticFix } from 'lynx-core/src/diagnostic/diagnostic-fix';
import { map, merge, Observable } from 'rxjs';
import { TextDocument } from 'vscode-languageserver-textdocument';
  
export interface BasicCheckerConfig {
  maxNumberOfProblems: number;
}
  
export abstract class AbstractChecker implements DiagnosticProvider {
      
  public readonly diagnosticsChanged$: Observable<DiagnosticsChanged>;
  
  constructor(public readonly id: string,
              protected readonly documentManager: DocumentManager<TextDocument>,
              protected readonly config: () => BasicCheckerConfig) {

    this.diagnosticsChanged$ = merge(
      documentManager.opened$.pipe(
        map((e) => ({
          uri: e.document.uri,
          version: e.document.version,
          diagnostics: this.validateTextDocument(e.document),
        })),
      ),
      documentManager.changed$.pipe(
        map((e) => ({
          uri: e.document.uri,
          version: e.document.version,
          diagnostics: this.validateTextDocument(e.document),
        })),
      ),
      documentManager.closed$.pipe(
        map((e) => {
          const doc = this.documentManager.get(e.uri);
          return { uri: e.uri, version: doc?.version, diagnostics: [] };
        }),
      ),
    );
  }
  
  getDiagnostics(uri: string): Diagnostic[] {
    const doc = this.documentManager.get(uri);
    if (doc == null) {
      return [];
    }
    return this.validateTextDocument(doc);
  }
  
  getDiagnosticFixes(uri: string, diagnostic: Diagnostic): DiagnosticFix[] {
    const doc = this.documentManager.get(uri);
    if (doc == null) {
      return [];
    }
    return this.getFixes(doc, diagnostic);
  }

  protected abstract validateTextDocument(textDocument: TextDocument): Diagnostic[];

  protected abstract getFixes(textDocument: TextDocument, diagnostic: Diagnostic): DiagnosticFix[];
}