import {
  DocumentFactory,
  DocumentManager,
  Localizer,
  ScriptureChapter,
  ScriptureDocument,
  ScriptureEditFactory,
  ScriptureNode,
  ScriptureParagraph,
  ScriptureText,
  ScriptureTextDocument,
  ScriptureVerse,
} from '@sillsdev/lynx';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { VerseOrderDiagnosticProvider } from './verse-order-diagnostic-provider';

describe('VerseOrderDiagnosticProvider', () => {
  it('out of order', async () => {
    const env = new TestEnvironment();
    await env.init();
    env.addDocument('file1', [
      new ScriptureChapter('1'),
      new ScriptureParagraph('p', undefined, [
        new ScriptureVerse('1', {
          start: { line: 2, character: 0 },
          end: { line: 2, character: 4 },
        }),
        new ScriptureText('Chapter one, verse one.'),
        new ScriptureVerse('3', {
          start: { line: 3, character: 0 },
          end: { line: 3, character: 4 },
        }),
        new ScriptureText('Chapter one, verse three.'),
        new ScriptureVerse('2', {
          start: { line: 4, character: 0 },
          end: { line: 4, character: 4 },
        }),
        new ScriptureText('Chapter one, verse two.'),
      ]),
    ]);

    const diagnostics = await env.provider.getDiagnostics('file1');

    expect(diagnostics).has.length(1);
    expect(diagnostics[0].code).toEqual(1);
    expect(diagnostics[0].range).toEqual({ start: { line: 3, character: 0 }, end: { line: 3, character: 4 } });
    expect(diagnostics[0].message).toEqual('Verse 3 occurs out of order in chapter 1.');
    expect(diagnostics[0].moreInfo).toContain('Verses should occur in ascending order');
  });

  it('missing verse', async () => {
    const env = new TestEnvironment();
    await env.init();
    env.addDocument('file1', [
      new ScriptureChapter('1'),
      new ScriptureParagraph('p', undefined, [
        new ScriptureVerse('1', {
          start: { line: 2, character: 0 },
          end: { line: 2, character: 4 },
        }),
        new ScriptureText('Chapter one, verse one.'),
        new ScriptureVerse('3', {
          start: { line: 3, character: 0 },
          end: { line: 3, character: 4 },
        }),
        new ScriptureText('Chapter one, verse three.'),
      ]),
    ]);

    const diagnostics = await env.provider.getDiagnostics('file1');

    expect(diagnostics).has.length(1);
    expect(diagnostics[0].code).toEqual(2);
    expect(diagnostics[0].range).toEqual({ start: { line: 3, character: 0 }, end: { line: 3, character: 4 } });
    expect(diagnostics[0].message).toContain('Verse 2 is missing from chapter 1.');
    expect(diagnostics[0].moreInfo).toContain('A chapter should contain verse markers');
  });
});

class TestEnvironment {
  private readonly localizer: Localizer;
  private readonly editFactory: ScriptureEditFactory;
  readonly docManager: DocumentManager<ScriptureDocument>;
  readonly provider: VerseOrderDiagnosticProvider;

  constructor() {
    this.localizer = new Localizer();
    this.editFactory = mock<ScriptureEditFactory>();
    this.docManager = new DocumentManager(mock<DocumentFactory<ScriptureDocument>>());
    this.provider = new VerseOrderDiagnosticProvider(this.localizer, this.docManager, this.editFactory);
  }

  async init(): Promise<void> {
    await this.provider.init();
    await this.localizer.init();
  }

  addDocument(uri: string, nodes: ScriptureNode[]): void {
    this.docManager.add(new ScriptureTextDocument(uri, 'text', 1, '', nodes));
  }
}
