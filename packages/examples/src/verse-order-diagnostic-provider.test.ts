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
import { firstValueFrom, take, toArray } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { VerseOrderDiagnosticProvider } from './verse-order-diagnostic-provider';

describe('VerseOrderDiagnosticProvider', () => {
  it('out of order', async () => {
    const env = new TestEnvironment();
    await env.init();
    env.addOutOfOrderDocument('file1');

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
    env.addMissingVerseDocument('file1');

    const diagnostics = await env.provider.getDiagnostics('file1');

    expect(diagnostics).has.length(1);
    expect(diagnostics[0].code).toEqual(2);
    expect(diagnostics[0].range).toEqual({ start: { line: 3, character: 0 }, end: { line: 3, character: 4 } });
    expect(diagnostics[0].message).toContain('Verse 2 is missing from chapter 1.');
    expect(diagnostics[0].moreInfo).toContain('A chapter should contain verse markers');
  });

  it('diagnosticsChanged$ - only open doc', async () => {
    const env = new TestEnvironment();
    await env.init();
    env.addOutOfOrderDocument('file1');
    env.addMissingVerseDocument('file2');

    const changedPromise = firstValueFrom(env.provider.diagnosticsChanged$.pipe(take(2), toArray()));
    await env.docManager.fireOpened('file1');
    await env.docManager.fireClosed('file1');
    const changedEvents = await changedPromise;

    expect(changedEvents).has.length(2);
    let changedEvent = changedEvents[0];
    expect(changedEvent.uri).toEqual('file1');
    expect(changedEvent.diagnostics).has.length(1);
    expect(changedEvent.diagnostics[0].code).toEqual(1);

    changedEvent = changedEvents[1];
    expect(changedEvent.uri).toEqual('file1');
    expect(changedEvent.diagnostics).has.length(0);
  });

  it('diagnosticsChanged$ - all docs', async () => {
    const env = new TestEnvironment(true);
    await env.init();
    env.addOutOfOrderDocument('file1');
    env.addMissingVerseDocument('file2');

    const changedPromise = firstValueFrom(env.provider.diagnosticsChanged$.pipe(take(5), toArray()));
    await env.docManager.fireOpened('file1');
    await env.docManager.fireClosed('file1');
    await env.docManager.fireDeleted('file1');
    env.addOutOfOrderDocument('file3');
    await env.docManager.fireCreated('file3');
    const changedEvents = await changedPromise;

    expect(changedEvents).has.length(5);
    let changedEvent = changedEvents[0];
    expect(changedEvent.uri).toEqual('file1');
    expect(changedEvent.diagnostics).has.length(1);
    expect(changedEvent.diagnostics[0].code).toEqual(1);

    changedEvent = changedEvents[1];
    expect(changedEvent.uri).toEqual('file2');
    expect(changedEvent.diagnostics).has.length(1);
    expect(changedEvent.diagnostics[0].code).toEqual(2);

    changedEvent = changedEvents[2];
    expect(changedEvent.uri).toEqual('file1');
    expect(changedEvent.diagnostics).has.length(1);
    expect(changedEvent.diagnostics[0].code).toEqual(1);

    changedEvent = changedEvents[3];
    expect(changedEvent.uri).toEqual('file1');
    expect(changedEvent.diagnostics).has.length(0);

    changedEvent = changedEvents[4];
    expect(changedEvent.uri).toEqual('file3');
    expect(changedEvent.diagnostics).has.length(1);
    expect(changedEvent.diagnostics[0].code).toEqual(1);
  });
});

class TestEnvironment {
  private readonly localizer: Localizer;
  private readonly editFactory: ScriptureEditFactory;
  readonly docManager: DocumentManager<ScriptureDocument>;
  readonly provider: VerseOrderDiagnosticProvider;

  constructor(validateAllDocuments = false) {
    this.localizer = new Localizer();
    this.editFactory = mock<ScriptureEditFactory>();
    this.docManager = new DocumentManager(mock<DocumentFactory<ScriptureDocument>>());
    this.provider = new VerseOrderDiagnosticProvider(
      this.localizer,
      this.docManager,
      this.editFactory,
      validateAllDocuments,
    );
  }

  async init(): Promise<void> {
    await this.provider.init();
    await this.localizer.init();
  }

  addDocument(uri: string, nodes: ScriptureNode[]): void {
    this.docManager.add(new ScriptureTextDocument(uri, 'text', 1, '', nodes));
  }

  addOutOfOrderDocument(uri: string): void {
    this.addDocument(uri, [
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
  }

  addMissingVerseDocument(uri: string): void {
    this.addDocument(uri, [
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
  }
}
