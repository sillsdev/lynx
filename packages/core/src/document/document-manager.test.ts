import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { mock, MockProxy } from 'vitest-mock-extended';

import { DocumentManager } from './document-manager';
import { DocumentReader } from './document-reader';
import { TextDocument } from './text-document';
import { TextDocumentFactory } from './text-document-factory';

describe('DocumentManager', () => {
  it('all', async () => {
    const env = new TestEnvironment();

    await env.docManager.get('file1');
    const docs = await env.docManager.all();
    expect(docs).toHaveLength(2);
    expect(docs[0].content).toEqual('This is file1.');
    expect(docs[1].content).toEqual('This is file2.');
  });

  it('get', async () => {
    const env = new TestEnvironment();

    const doc = await env.docManager.get('file2');
    expect(doc).not.toBeNull();
    expect(doc?.content).toEqual('This is file2.');
  });

  it('fire created event', async () => {
    const env = new TestEnvironment();

    const createdPromise = firstValueFrom(env.docManager.created$);
    await env.docManager.fireCreated('file1');
    const createdEvent = await createdPromise;
    expect(createdEvent.document.uri).toEqual('file1');
    expect(createdEvent.document.content).toEqual('This is file1.');
  });

  it('fire opened event', async () => {
    const env = new TestEnvironment();

    const openedPromise = firstValueFrom(env.docManager.opened$);
    await expect(env.docManager.active()).resolves.toHaveLength(0);
    await env.docManager.fireOpened('file1', { format: 'plaintext', version: 1, content: 'This is opened file1.' });
    await expect(env.docManager.active()).resolves.toHaveLength(1);
    const openedEvent = await openedPromise;
    expect(openedEvent.document.uri).toEqual('file1');
    expect(openedEvent.document.content).toEqual('This is opened file1.');
  });

  it('fire closed event', async () => {
    const env = new TestEnvironment();
    await env.docManager.fireOpened('file1', { format: 'plaintext', version: 1, content: 'content' });

    const closedPromise = firstValueFrom(env.docManager.closed$);
    await expect(env.docManager.active()).resolves.toHaveLength(1);
    await env.docManager.fireClosed('file1');
    await expect(env.docManager.active()).resolves.toHaveLength(0);
    const closedEvent = await closedPromise;
    expect(closedEvent.uri).toEqual('file1');
  });

  it('fire deleted event', async () => {
    const env = new TestEnvironment();

    const deletedPromise = firstValueFrom(env.docManager.deleted$);
    await env.docManager.fireDeleted('file1');
    env.docReader.keys.mockResolvedValue(['file2']);
    await expect(env.docManager.all()).resolves.toHaveLength(1);
    const deletedEvent = await deletedPromise;
    expect(deletedEvent.uri).toEqual('file1');
  });

  it('fire changed event', async () => {
    const env = new TestEnvironment();

    const changedPromise = firstValueFrom(env.docManager.changed$);
    await env.docManager.fireChanged('file1', { contentChanges: [{ text: 'This is changed file1.' }], version: 2 });
    const changedEvent = await changedPromise;
    expect(changedEvent.document.uri).toEqual('file1');
    expect(changedEvent.document.version).toEqual(2);
    expect(changedEvent.document.content).toEqual('This is changed file1.');

    // reload document from reader
    await env.docManager.fireChanged('file1');
    const doc = await env.docManager.get('file1');
    expect(doc).not.toBeNull();
    expect(doc?.content).toEqual('This is file1.');
  });

  it('fire reset event', async () => {
    const env = new TestEnvironment();
    // cause all documents to be loaded
    await env.docManager.all();

    const resetPromise = firstValueFrom(env.docManager.reset$);
    await env.docManager.reset();
    const resetEvent = await resetPromise;
    expect(resetEvent.loadedUris).toEqual(['file1', 'file2']);
    expect(resetEvent.activeUris).toEqual([]);
  });
});

class TestEnvironment {
  readonly docReader: MockProxy<DocumentReader>;
  readonly docFactory: TextDocumentFactory;
  readonly docManager: DocumentManager<TextDocument>;

  constructor() {
    this.docReader = mock<DocumentReader>();
    this.docReader.read.mockImplementation((uri) => {
      return Promise.resolve({ format: 'plaintext', version: 1, content: `This is ${uri}.` });
    });
    this.docReader.keys.mockResolvedValue(['file1', 'file2']);
    this.docFactory = new TextDocumentFactory();
    this.docManager = new DocumentManager(this.docFactory, this.docReader);
  }
}
