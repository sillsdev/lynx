import {
  DocumentFactory,
  DocumentManager,
  Localizer,
  ScriptureChapter,
  ScriptureDocument,
  ScriptureParagraph,
  ScriptureSerializer,
  ScriptureText,
  ScriptureVerse,
} from '@sillsdev/lynx';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { VerseOrderDiagnosticProvider } from './verse-order-diagnostic-provider';

describe('VerseOrderDiagnosticProvider', () => {
  it('out of order', async () => {
    const env = new TestEnvironment();
    await env.init();
    env.docManager.add(
      new ScriptureDocument('file1', 1, '', [
        new ScriptureChapter('1'),
        new ScriptureParagraph('p', [
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
      ]),
    );

    const diagnostics = await env.provider.getDiagnostics('file1');

    expect(diagnostics).has.length(1);
    expect(diagnostics[0].code).toEqual(1);
    expect(diagnostics[0].range).toEqual({ start: { line: 3, character: 0 }, end: { line: 3, character: 4 } });
  });

  it('missing verse', async () => {
    const env = new TestEnvironment();
    await env.init();
    env.docManager.add(
      new ScriptureDocument('file1', 1, '', [
        new ScriptureChapter('1'),
        new ScriptureParagraph('p', [
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
      ]),
    );

    const diagnostics = await env.provider.getDiagnostics('file1');

    expect(diagnostics).has.length(1);
    expect(diagnostics[0].code).toEqual(2);
    expect(diagnostics[0].range).toEqual({ start: { line: 3, character: 0 }, end: { line: 3, character: 4 } });
  });
});

class TestEnvironment {
  private readonly localizer: Localizer;
  readonly docManager: DocumentManager<ScriptureDocument>;
  readonly provider: VerseOrderDiagnosticProvider;

  constructor() {
    this.localizer = new Localizer();
    this.docManager = new DocumentManager(mock<DocumentFactory<ScriptureDocument>>());
    this.provider = new VerseOrderDiagnosticProvider(this.localizer, this.docManager, mock<ScriptureSerializer>());
  }

  async init(): Promise<void> {
    await this.provider.init();
    await this.localizer.init();
  }
}
