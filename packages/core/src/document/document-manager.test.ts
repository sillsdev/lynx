import { describe, expect, it } from 'vitest';
import { mock, MockProxy } from 'vitest-mock-extended';

import { Document } from './document';
import { DocumentFactory } from './document-factory';
import { DocumentManager } from './document-manager';
import { DocumentReader } from './document-reader';

describe('DocumentManager', () => {
  it('all', async () => {
    const env = new TestEnvironment();

    await expect(env.docManager.all()).resolves.toEqual([
      { uri: 'file1', format: 'plaintext', version: 1, content: 'This is file1.' },
      { uri: 'file2', format: 'plaintext', version: 1, content: 'This is file2.' },
    ]);
  });

  it('get', async () => {
    const env = new TestEnvironment();

    await expect(env.docManager.get('file2')).resolves.toEqual({
      uri: 'file2',
      format: 'plaintext',
      version: 1,
      content: 'This is file2.',
    });
  });

  it('fire created event', async () => {
    const env = new TestEnvironment();

    expect.assertions(1);
    env.docManager.created$.subscribe((e) => {
      expect(e.document).toEqual({ uri: 'file1', format: 'plaintext', version: 1, content: 'This is file1.' });
    });
    await env.docManager.fireCreated('file1');
  });

  it('fire opened event', async () => {
    const env = new TestEnvironment();

    expect.assertions(3);
    env.docManager.opened$.subscribe((e) => {
      expect(e.document).toEqual({ uri: 'file1', format: 'plaintext', version: 1, content: 'This is opened file1.' });
    });
    await expect(env.docManager.active()).resolves.toHaveLength(0);
    await env.docManager.fireOpened('file1', 'plaintext', 1, 'This is opened file1.');
    await expect(env.docManager.active()).resolves.toHaveLength(1);
  });

  it('fire closed event', async () => {
    const env = new TestEnvironment();
    await env.docManager.fireOpened('file1', 'plaintext', 1, 'content');

    expect.assertions(3);
    env.docManager.closed$.subscribe((e) => {
      expect(e.uri).toEqual('file1');
    });
    await expect(env.docManager.active()).resolves.toHaveLength(1);
    await env.docManager.fireClosed('file1');
    await expect(env.docManager.active()).resolves.toHaveLength(0);
  });

  it('fire deleted event', async () => {
    const env = new TestEnvironment();

    expect.assertions(2);
    env.docManager.deleted$.subscribe((e) => {
      expect(e.uri).toEqual('file1');
    });
    await env.docManager.fireDeleted('file1');
    env.docReader.keys.mockReturnValue(['file2']);
    await expect(env.docManager.all()).resolves.toHaveLength(1);
  });

  it('fire changed event', async () => {
    const env = new TestEnvironment();

    expect.assertions(2);
    const sub = env.docManager.changed$.subscribe((e) => {
      expect(e.document).toEqual({ uri: 'file1', format: 'plaintext', version: 2, content: 'This is changed file1.' });
    });
    await env.docManager.fireChanged('file1', [{ text: 'This is changed file1.' }], 2);
    sub.unsubscribe();
    await env.docManager.fireChanged('file1');
    await expect(env.docManager.get('file1')).resolves.toEqual({
      uri: 'file1',
      format: 'plaintext',
      version: 1,
      content: 'This is file1.',
    });
  });
});

class TestEnvironment {
  readonly docReader: MockProxy<DocumentReader>;
  readonly docFactory: MockProxy<DocumentFactory<Document>>;
  readonly docManager: DocumentManager<Document>;

  constructor() {
    this.docReader = mock<DocumentReader>();
    this.docReader.read.mockImplementation((uri) => {
      return Promise.resolve({ format: 'plaintext', version: 1, content: `This is ${uri}.` });
    });
    this.docReader.keys.mockReturnValue(['file1', 'file2']);

    this.docFactory = mock<DocumentFactory<Document>>();
    this.docFactory.create.mockImplementation((uri, format, version, content) => {
      return { uri, format, version, content };
    });
    this.docFactory.update.mockImplementation((document, changes, version) => {
      return { uri: document.uri, format: 'plaintext', version, content: changes[0].text };
    });

    this.docManager = new DocumentManager(this.docFactory, this.docReader);
  }
}
