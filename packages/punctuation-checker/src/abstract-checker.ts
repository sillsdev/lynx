import {
  Diagnostic,
  DiagnosticFix,
  DiagnosticProvider,
  DiagnosticsChanged,
  DocumentManager,
  TextDocument,
} from '@sillsdev/lynx';
import { map, merge, Observable, switchMap } from 'rxjs';

export abstract class AbstractChecker implements DiagnosticProvider {
  public readonly diagnosticsChanged$: Observable<DiagnosticsChanged>;

  constructor(
    public readonly id: string,
    protected readonly documentManager: DocumentManager<TextDocument>,
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

  init(): Promise<void> {
    return Promise.resolve();
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

  protected abstract validateTextDocument(textDocument: TextDocument): Diagnostic[];

  protected abstract getFixes(textDocument: TextDocument, diagnostic: Diagnostic): DiagnosticFix[];
}
