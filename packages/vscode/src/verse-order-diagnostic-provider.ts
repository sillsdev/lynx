import {
  Diagnostic,
  DiagnosticFix,
  DiagnosticProvider,
  DiagnosticsChanged,
  DiagnosticSeverity,
  DocumentManager,
  ScriptureChapter,
  ScriptureDocument,
  ScriptureNodeType,
  ScriptureVerse,
} from '@sillsdev/lynx';
import { map, merge, Observable, switchMap } from 'rxjs';

export class VerseOrderDiagnosticProvider implements DiagnosticProvider {
  public readonly id = 'verse-order';
  public readonly diagnosticsChanged$: Observable<DiagnosticsChanged>;

  constructor(private readonly documentManager: DocumentManager<ScriptureDocument>) {
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
        title: `Insert missing verse`,
        isPreferred: true,
        diagnostic,
        edits: [
          {
            range: { start: diagnostic.range.start, end: diagnostic.range.start },
            newText: `\\v ${verseNumber.toString()} `,
          },
        ],
      });
    }
    return Promise.resolve(fixes);
  }

  private validateDocument(doc: ScriptureDocument): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const verseNodes: [number, ScriptureVerse][] = [];
    for (const node of doc.findNodes([ScriptureNodeType.Chapter, ScriptureNodeType.Verse])) {
      if (node instanceof ScriptureChapter) {
        diagnostics.push(...this.findMissingVerse(verseNodes));
        verseNodes.length = 0;
      } else if (node instanceof ScriptureVerse) {
        const verseNumber = parseInt(node.number);
        if (verseNodes.length > 0) {
          const [prevVerseNumber, prevVerseNode] = verseNodes[verseNodes.length - 1];
          if (verseNumber <= prevVerseNumber) {
            diagnostics.push({
              range: prevVerseNode.range,
              severity: DiagnosticSeverity.Error,
              code: 1,
              message: 'Verses are out of order.',
              source: this.id,
            });
          }
        }
        verseNodes.push([verseNumber, node]);
      }
    }

    diagnostics.push(...this.findMissingVerse(verseNodes));
    return diagnostics;
  }

  private findMissingVerse(verseNodes: [number, ScriptureVerse][]): Diagnostic[] {
    verseNodes.sort((a, b) => a[0] - b[0]);
    const diagnostics: Diagnostic[] = [];
    for (const [i, [number, node]] of verseNodes.entries()) {
      if (number !== i + 1) {
        diagnostics.push({
          range: node.range,
          severity: DiagnosticSeverity.Warning,
          code: 2,
          message: 'Verse is missing.',
          source: this.id,
          data: number - 1,
        });
      }
    }
    return diagnostics;
  }
}
