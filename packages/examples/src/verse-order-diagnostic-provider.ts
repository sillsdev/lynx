import {
  activeDiagnosticsChanged$,
  allDiagnosticsChanged$,
  Diagnostic,
  DiagnosticFix,
  DiagnosticProvider,
  DiagnosticsChanged,
  DiagnosticSeverity,
  DocumentAccessor,
  Localizer,
  ScriptureChapter,
  ScriptureDocument,
  ScriptureEditFactory,
  ScriptureNodeType,
  ScriptureVerse,
  TextEdit,
} from '@sillsdev/lynx';
import { Observable, Subject } from 'rxjs';

export class VerseOrderDiagnosticProvider<T = TextEdit> implements DiagnosticProvider<T> {
  public readonly id = 'verse-order';
  public readonly diagnosticsChanged$: Observable<DiagnosticsChanged>;
  private readonly refreshSubject = new Subject<string>();

  constructor(
    private readonly localizer: Localizer,
    private readonly documents: DocumentAccessor<ScriptureDocument>,
    private readonly editFactory: ScriptureEditFactory<ScriptureDocument, T>,
    validateAllDocuments = false,
  ) {
    if (validateAllDocuments) {
      this.diagnosticsChanged$ = allDiagnosticsChanged$(
        documents,
        (doc) => Promise.resolve(this.validateDocument(doc)),
        this.refreshSubject,
      );
    } else {
      this.diagnosticsChanged$ = activeDiagnosticsChanged$(
        documents,
        (doc) => Promise.resolve(this.validateDocument(doc)),
        this.refreshSubject,
      );
    }
  }

  init(): Promise<void> {
    this.localizer.addNamespace(
      'verseOrder',
      (language: string) => import(`./locales/${language}/verse-order.json`, { with: { type: 'json' } }),
    );
    return Promise.resolve();
  }

  async getDiagnostics(uri: string): Promise<Diagnostic[]> {
    const doc = await this.documents.get(uri);
    if (doc == null) {
      return [];
    }
    return this.validateDocument(doc);
  }

  async getDiagnosticFixes(uri: string, diagnostic: Diagnostic): Promise<DiagnosticFix<T>[]> {
    const doc = await this.documents.get(uri);
    if (doc == null) {
      return [];
    }
    const fixes: DiagnosticFix<T>[] = [];
    if (diagnostic.code === 2) {
      const verseNumber = diagnostic.data as number;
      fixes.push({
        title: this.localizer.t('missingVerse.fixTitle', { ns: 'verseOrder' }),
        isPreferred: true,
        diagnostic,
        edits: this.editFactory.createScriptureEdit(
          doc,
          { start: diagnostic.range.start, end: diagnostic.range.start },
          new ScriptureVerse(verseNumber.toString()),
        ),
      });
    }
    return fixes;
  }

  refresh(uri: string): Promise<void> {
    this.refreshSubject.next(uri);
    return Promise.resolve();
  }

  private validateDocument(doc: ScriptureDocument): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const verseNodes: [number, ScriptureVerse][] = [];
    let chapterNumber = '0';
    for (const node of doc.findNodes([ScriptureNodeType.Chapter, ScriptureNodeType.Verse])) {
      if (node instanceof ScriptureChapter) {
        diagnostics.push(...this.findMissingVerses(chapterNumber, verseNodes));
        chapterNumber = node.number;
        verseNodes.length = 0;
      } else if (node instanceof ScriptureVerse) {
        const verseNumber = parseInt(node.number);
        if (!isNaN(verseNumber)) {
          if (verseNodes.length > 0) {
            const [prevVerseNumber, prevVerseNode] = verseNodes[verseNodes.length - 1];
            if (verseNumber <= prevVerseNumber) {
              diagnostics.push({
                range: prevVerseNode.range,
                severity: DiagnosticSeverity.Error,
                code: 1,
                message: this.localizer.t('verseOutOfOrder.description', {
                  ns: 'verseOrder',
                  chapter: chapterNumber,
                  verse: prevVerseNumber.toString(),
                }),
                moreInfo: this.localizer.t('verseOutOfOrder.moreInfo', { ns: 'verseOrder' }),
                source: this.id,
                fingerprint: `1|${chapterNumber}:${prevVerseNumber.toString()}`,
              });
            }
          }
          verseNodes.push([verseNumber, node]);
        }
      }
    }

    diagnostics.push(...this.findMissingVerses(chapterNumber, verseNodes));
    return diagnostics;
  }

  private findMissingVerses(chapterNumber: string, verseNodes: [number, ScriptureVerse][]): Diagnostic[] {
    verseNodes.sort((a, b) => a[0] - b[0]);
    const diagnostics: Diagnostic[] = [];
    for (const [i, [number, node]] of verseNodes.entries()) {
      if (number !== i + 1) {
        const missingVerse = number - 1;
        diagnostics.push({
          range: node.range,
          severity: DiagnosticSeverity.Warning,
          code: 2,
          message: this.localizer.t('missingVerse.description', {
            ns: 'verseOrder',
            chapter: chapterNumber,
            verse: missingVerse.toString(),
          }),
          moreInfo: this.localizer.t('missingVerse.moreInfo', { ns: 'verseOrder' }),
          source: this.id,
          data: missingVerse,
          fingerprint: `2|${chapterNumber}:${missingVerse.toString()}`,
        });
      }
    }
    return diagnostics;
  }
}
