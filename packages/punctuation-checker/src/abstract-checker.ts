import {
  Diagnostic,
  DiagnosticFix,
  DiagnosticProvider,
  DiagnosticsChanged,
  DocumentAccessor,
  ScriptureDocument,
  ScriptureNodeType,
  TextDocument,
} from '@sillsdev/lynx';
import { map, merge, Observable, switchMap } from 'rxjs';

import { DiagnosticFactory } from './diagnostic-factory';
import { IssueFinder, IssueFinderFactory } from './issue-finder';
import { isScriptureDocument, ScriptureNodeGrouper } from './utils';

export abstract class AbstractChecker<T extends TextDocument | ScriptureDocument> implements DiagnosticProvider {
  public readonly diagnosticsChanged$: Observable<DiagnosticsChanged>;

  constructor(
    public readonly id: string,
    private readonly documentAccessor: DocumentAccessor<T>,
    private readonly issueFinderFactory: IssueFinderFactory,
  ) {
    this.diagnosticsChanged$ = merge(
      documentAccessor.opened$.pipe(
        map((e) => ({
          uri: e.document.uri,
          version: e.document.version,
          diagnostics: this.validateDocument(e.document),
        })),
      ),
      documentAccessor.changed$.pipe(
        map((e) => ({
          uri: e.document.uri,
          version: e.document.version,
          diagnostics: this.validateDocument(e.document),
        })),
      ),
      documentAccessor.closed$.pipe(
        switchMap(async (e) => {
          const doc = await this.documentAccessor.get(e.uri);
          return { uri: e.uri, version: doc?.version, diagnostics: [] };
        }),
      ),
    );
  }

  init(): Promise<void> {
    return Promise.resolve();
  }

  async getDiagnostics(uri: string): Promise<Diagnostic[]> {
    const doc = await this.documentAccessor.get(uri);
    if (doc == null) {
      return [];
    }
    return this.validateDocument(doc);
  }

  async getDiagnosticFixes(uri: string, diagnostic: Diagnostic): Promise<DiagnosticFix[]> {
    const doc = await this.documentAccessor.get(uri);
    if (doc == null) {
      return [];
    }
    return this.getFixes(doc, diagnostic);
  }

  private validateDocument(document: T): Diagnostic[] {
    if (isScriptureDocument(document)) {
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

  protected abstract getFixes(document: T, diagnostic: Diagnostic): DiagnosticFix[];
}
