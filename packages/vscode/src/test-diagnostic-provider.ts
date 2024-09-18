import {
  Diagnostic,
  DiagnosticProvider,
  DiagnosticProviderFactory,
  DiagnosticsChanged,
  DiagnosticSeverity,
  DocumentManager,
} from 'lynx-core';
import { map, merge, Observable } from 'rxjs';
import { TextDocument } from 'vscode-languageserver-textdocument';

export interface TestDiagnosticProviderConfig {
  maxNumberOfProblems: number;
}

export class TestDiagnosticProvider implements DiagnosticProvider {
  static factory(config: () => TestDiagnosticProviderConfig): DiagnosticProviderFactory<TextDocument> {
    return (documentManager: DocumentManager<TextDocument>) => new TestDiagnosticProvider(documentManager, config);
  }

  public readonly diagnosticsChanged$: Observable<DiagnosticsChanged>;

  constructor(
    private readonly documentManager: DocumentManager<TextDocument>,
    private readonly config: () => TestDiagnosticProviderConfig,
  ) {
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

  private validateTextDocument(textDocument: TextDocument): Diagnostic[] {
    // In this simple example we get the settings for every validate run.
    const settings = this.config();

    // The validator creates diagnostics for all uppercase words length 2 and more
    const text = textDocument.getText();
    const pattern = /\b[A-Z]{2,}\b/g;
    let m: RegExpExecArray | null;

    let problems = 0;
    const diagnostics: Diagnostic[] = [];
    while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
      problems++;
      const diagnostic: Diagnostic = {
        severity: DiagnosticSeverity.Warning,
        range: {
          start: textDocument.positionAt(m.index),
          end: textDocument.positionAt(m.index + m[0].length),
        },
        message: `${m[0]} is all uppercase.`,
        source: 'ex',
      };
      diagnostics.push(diagnostic);
    }
    return diagnostics;
  }
}
