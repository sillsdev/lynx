import {
  Diagnostic,
  DiagnosticFix,
  DiagnosticProvider,
  DiagnosticsChanged,
  DiagnosticSeverity,
  DocumentManager,
  Localizer,
  ScriptureChapter,
  ScriptureDocument,
  ScriptureNodeType,
  ScriptureSerializer,
  ScriptureVerse,
} from '@sillsdev/lynx';
import { map, merge, Observable, switchMap } from 'rxjs';

export class VerseOrderDiagnosticProvider implements DiagnosticProvider {
  public readonly id = 'verse-order';
  public readonly diagnosticsChanged$: Observable<DiagnosticsChanged>;

  constructor(
    private readonly localizer: Localizer,
    private readonly documentManager: DocumentManager<ScriptureDocument>,
    private readonly serializer: ScriptureSerializer,
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
    this.localizer.addNamespace(
      'verseOrder',
      (language: string) =>
        import(/* @vite-ignore */ `./locales/${language}/verse-order.json`, { with: { type: 'json' } }),
    );
    return Promise.resolve();
  }

  async getDiagnostics(uri: string): Promise<Diagnostic[]> {
    const doc = await this.documentManager.get(uri);
    if (doc == null) {
      return [];
    }
    return this.validateDocument(doc);
  }

  getDiagnosticFixes(_uri: string, diagnostic: Diagnostic): Promise<DiagnosticFix[]> {
    const fixes: DiagnosticFix[] = [];
    if (diagnostic.code === 2) {
      const verseNumber = diagnostic.data as number;
      fixes.push({
        title: this.localizer.t('missingVerse.fixTitle', { ns: 'verseOrder' }),
        isPreferred: true,
        diagnostic,
        edits: [
          {
            range: { start: diagnostic.range.start, end: diagnostic.range.start },
            newText: this.serializer.serialize(new ScriptureVerse(verseNumber.toString())),
          },
        ],
      });
    }
    return Promise.resolve(fixes);
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
                source: this.id,
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
          source: this.id,
          data: missingVerse,
        });
      }
    }
    return diagnostics;
  }
}
