import {
  Diagnostic,
  DiagnosticFix,
  DiagnosticProvider,
  DiagnosticsChanged,
  DocumentManager,
  ScriptureDocument,
  ScriptureNodeType,
  TextDocument,
} from '@sillsdev/lynx';
import { map, merge, Observable, switchMap } from 'rxjs';

import { DiagnosticFactory } from './diagnostic-factory';
import { IssueFinder, IssueFinderFactory } from './issue-finder';
import { ScriptureNodeGrouper } from './utils';

export abstract class AbstractChecker implements DiagnosticProvider {
  public readonly diagnosticsChanged$: Observable<DiagnosticsChanged>;

  constructor(
    public readonly id: string,
    private readonly documentManager: DocumentManager<TextDocument | ScriptureDocument>,
    private readonly issueFinderFactory: IssueFinderFactory,
  ) {
    this.diagnosticsChanged$ = merge(
      documentManager.opened$.pipe(
        map((e) => ({
          uri: e.document.uri,
          version: e.document.version,
          diagnostics: this.validateDocument(e.document),
        })),
      ),
      documentManager.changed$.pipe(
        map((e) => ({
          uri: e.document.uri,
          version: e.document.version,
          diagnostics: this.validateDocument(e.document),
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
    return this.validateDocument(doc);
  }

  async getDiagnosticFixes(uri: string, diagnostic: Diagnostic): Promise<DiagnosticFix[]> {
    const doc = await this.documentManager.get(uri);
    if (doc == null) {
      return [];
    }
    return this.getFixes(doc, diagnostic);
  }

  private validateDocument(document: TextDocument | ScriptureDocument): Diagnostic[] {
    if (document instanceof ScriptureDocument) {
      return this.validateScriptureDocument(document);
    }
    return this.validateTextDocument(document);
  }

  protected validateTextDocument(textDocument: TextDocument): Diagnostic[] {
    const diagnosticFactory: DiagnosticFactory = new DiagnosticFactory(this.id, textDocument);

    const issueFinder: IssueFinder = this.issueFinderFactory.createIssueFinder(diagnosticFactory);
    return issueFinder.produceDiagnostics(textDocument.getText());
  }

  protected validateScriptureDocument(scriptureDocument: ScriptureDocument): Diagnostic[] {
    let diagnostics: Diagnostic[] = [];
    const diagnosticFactory: DiagnosticFactory = new DiagnosticFactory(this.id, scriptureDocument);

    const issueFinder: IssueFinder = this.issueFinderFactory.createIssueFinder(diagnosticFactory);

    const scriptureNodeGrouper: ScriptureNodeGrouper = new ScriptureNodeGrouper(
      scriptureDocument.findNodes([ScriptureNodeType.Text]),
    );
    for (const nonVerseNode of scriptureNodeGrouper.getNonVerseNodes()) {
      diagnostics = diagnostics.concat(issueFinder.produceDiagnosticsForScripture(nonVerseNode));
    }
    diagnostics = diagnostics.concat(issueFinder.produceDiagnosticsForScripture(scriptureNodeGrouper.getVerseNodes()));
    return diagnostics;
  }

  protected abstract getFixes(document: TextDocument | ScriptureDocument, diagnostic: Diagnostic): DiagnosticFix[];
}
