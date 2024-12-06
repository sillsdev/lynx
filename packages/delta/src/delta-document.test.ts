import Delta from 'quill-delta';
import { describe, expect, it } from 'vitest';

import { DeltaDocument } from './delta-document';

describe('DeltaDocument', () => {
  it('getText', () => {
    const document = new DeltaDocument(
      'uri',
      'rich-text',
      1,
      new Delta()
        .insert('Hello\n\n')
        .insert('World')
        .insert({ image: 'octocat.png' })
        .insert('\n', { align: 'right' })
        .insert('!')
        .insert('\n'),
    );

    expect(document.getText()).toEqual('Hello\n\nWorld\uFFFC\n!\n');
  });

  it('update', () => {
    const document = new DeltaDocument('uri', 'rich-text', 1, new Delta().insert('Hello World!').insert('\n'));
    document.update(new Delta().retain(6).delete(5).insert('everybody').ops, 2);

    expect(document.version).toEqual(2);
    expect(document.getText()).toEqual('Hello everybody!\n');
  });

  it('offsetAt', () => {
    const document = new DeltaDocument(
      'uri',
      'rich-text',
      1,
      new Delta()
        .insert('Hello\n\n')
        .insert('World')
        .insert({ image: 'octocat.png' })
        .insert('\n', { align: 'right' })
        .insert('!')
        .insert('\n'),
    );

    expect(document.offsetAt({ line: 0, character: 0 })).toEqual(0);
    expect(document.offsetAt({ line: 0, character: 5 })).toEqual(5);
    expect(document.offsetAt({ line: 1, character: 0 })).toEqual(6);
    expect(document.offsetAt({ line: 2, character: 0 })).toEqual(7);
    expect(document.offsetAt({ line: 2, character: 6 })).toEqual(13);
    expect(document.offsetAt({ line: 3, character: 0 })).toEqual(14);
  });

  it('positionAt', () => {
    const document = new DeltaDocument(
      'uri',
      'rich-text',
      1,
      new Delta()
        .insert('Hello\n\n')
        .insert('World')
        .insert({ image: 'octocat.png' })
        .insert('\n', { align: 'right' })
        .insert('!')
        .insert('\n'),
    );

    expect(document.positionAt(0)).toEqual({ line: 0, character: 0 });
    expect(document.positionAt(5)).toEqual({ line: 0, character: 5 });
    expect(document.positionAt(6)).toEqual({ line: 1, character: 0 });
    expect(document.positionAt(7)).toEqual({ line: 2, character: 0 });
    expect(document.positionAt(13)).toEqual({ line: 2, character: 6 });
    expect(document.positionAt(14)).toEqual({ line: 3, character: 0 });
  });
});
