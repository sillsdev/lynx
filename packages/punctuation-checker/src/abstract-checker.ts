import {
  activeDiagnosticsChanged$,
  allDiagnosticsChanged$,
  Diagnostic,
  DiagnosticFix,
  DiagnosticProvider,
  DiagnosticsChanged,
  DocumentAccessor,
  ScriptureDocument,
  TextDocument,
  TextEdit,
} from '@sillsdev/lynx';
import { Observable, Subject } from 'rxjs';

import { CheckableGroup, TextDocumentCheckable } from './checkable';
import { DiagnosticFactory } from './diagnostic-factory';
import { IssueFinder, IssueFinderFactory } from './issue-finder';
import { ScriptureTextNodeGrouper } from './scripture-grouper';
import { isScriptureDocument } from './utils';

export abstract class AbstractChecker<TDoc extends TextDocument | ScriptureDocument, TEdit = TextEdit>
  implements DiagnosticProvider<TEdit>
{
  public readonly diagnosticsChanged$: Observable<DiagnosticsChanged>;
  private readonly refreshSubject = new Subject<string>();

  constructor(
    public readonly id: string,
    private readonly documentAccessor: DocumentAccessor<TDoc>,
    private readonly issueFinderFactory: IssueFinderFactory,
    validateAllDocuments = false,
  ) {
    if (validateAllDocuments) {
      this.diagnosticsChanged$ = allDiagnosticsChanged$(
        documentAccessor,
        (doc) => this.validateDocument(doc),
        this.refreshSubject,
      );
    } else {
      this.diagnosticsChanged$ = activeDiagnosticsChanged$(
        documentAccessor,
        (doc) => this.validateDocument(doc),
        this.refreshSubject,
      );
    }
  }

  init(): Promise<void> {
    return Promise.resolve();
  }

  async getDiagnostics(uri: string): Promise<Diagnostic[]> {
    const doc = await this.documentAccessor.get(uri);
    if (doc == null) {
      return [];
    }
    return await this.validateDocument(doc);
  }

  async getDiagnosticFixes(uri: string, diagnostic: Diagnostic): Promise<DiagnosticFix<TEdit>[]> {
    const doc = await this.documentAccessor.get(uri);
    if (doc == null) {
      return [];
    }
    return this.getFixes(doc, diagnostic);
  }

  refresh(uri: string): void {
    this.refreshSubject.next(uri);
  }

  private async validateDocument(document: TDoc): Promise<Diagnostic[]> {
    if (isScriptureDocument(document)) {
      return await this.validateScriptureDocument(document);
    }
    return await this.validateTextDocument(document);
  }

  protected async validateTextDocument(textDocument: TextDocument): Promise<Diagnostic[]> {
    const diagnosticFactory: DiagnosticFactory = new DiagnosticFactory(this.id, textDocument);

    const issueFinder: IssueFinder = this.issueFinderFactory.createIssueFinder(diagnosticFactory);
    return await issueFinder.produceDiagnostics(
      new CheckableGroup([new TextDocumentCheckable(textDocument.getText())]),
    );
  }

  protected async validateScriptureDocument(scriptureDocument: ScriptureDocument): Promise<Diagnostic[]> {
    let diagnostics: Diagnostic[] = [];
    const diagnosticFactory: DiagnosticFactory = new DiagnosticFactory(this.id, scriptureDocument);

    const issueFinder: IssueFinder = this.issueFinderFactory.createIssueFinder(diagnosticFactory);

    const scriptureNodeGrouper: ScriptureTextNodeGrouper = new ScriptureTextNodeGrouper(scriptureDocument);
    for (const checkableGroup of scriptureNodeGrouper.getCheckableGroups()) {
      diagnostics = diagnostics.concat(await issueFinder.produceDiagnostics(checkableGroup));
    }
    return diagnostics;
  }

  protected abstract getFixes(document: TDoc, diagnostic: Diagnostic): DiagnosticFix<TEdit>[];
}
