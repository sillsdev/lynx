import {
  Diagnostic,
  DiagnosticProvider,
  DiagnosticProviderFactory,
  DiagnosticsChanged,
  DiagnosticSeverity,
  DocumentManager,
} from 'lynx-core';
import { DiagnosticFix } from 'lynx-core';
import { map, merge, Observable, switchMap } from 'rxjs';
import { TextDocument } from 'vscode-languageserver-textdocument';

export interface TestDiagnosticProviderConfig {
  maxNumberOfProblems: number;
}

export class TestDiagnosticProvider implements DiagnosticProvider {
  static factory(config: () => TestDiagnosticProviderConfig): DiagnosticProviderFactory<TextDocument> {
    return (documentManager: DocumentManager<TextDocument>) => new TestDiagnosticProvider(documentManager, config);
  }

  public readonly id = 'test';
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
        switchMap(async (e) => {
          const doc = await this.documentManager.get(e.uri);
          return { uri: e.uri, version: doc?.version, diagnostics: [] };
        }),
      ),
    );
  }

  async getDiagnostics(uri: string): Promise<Diagnostic[]> {
    const doc = await this.documentManager.get(uri);
    if (doc == null) {
      return [];
    }
    return this.validateTextDocument(doc);
  }

  async getDiagnosticFixes(uri: string, diagnostic: Diagnostic): Promise<DiagnosticFix[]> {
    const doc = await this.documentManager.get(uri);
    if (doc == null) {
      return [];
    }
    return this.getFixes(doc, diagnostic);
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
        code: 1,
        source: this.id,
        severity: DiagnosticSeverity.Warning,
        range: {
          start: textDocument.positionAt(m.index),
          end: textDocument.positionAt(m.index + m[0].length),
        },
        message: `${m[0]} is all uppercase.`,
      };
      diagnostics.push(diagnostic);
    }
    return diagnostics;
  }

  private getFixes(textDocument: TextDocument, diagnostic: Diagnostic): DiagnosticFix[] {
    if (diagnostic.code === 1) {
      const text = textDocument.getText();
      const start = textDocument.offsetAt(diagnostic.range.start);
      const end = textDocument.offsetAt(diagnostic.range.end);
      return [
        {
          title: `Convert to lowercase`,
          isPreferred: true,
          diagnostic,
          edits: [
            {
              range: diagnostic.range,
              newText: text.slice(start, end).toLowerCase(),
            },
          ],
        },
      ];
    }
    return [];
  }
}
