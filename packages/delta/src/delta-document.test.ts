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

  it('update single line, single op delta', () => {
    const document = new DeltaDocument(
      'uri',
      'rich-text',
      1,
      new Delta().insert('Hello World!').insert('\n').insert('Hello World!').insert('\n'),
    );
    document.update(new Delta().retain(19).delete(5).insert('everybody'), 2);

    expect(document.version).toEqual(2);
    expect(document.getText()).toEqual('Hello World!\nHello everybody!\n');
  });

  it('update single line, multiple op delta', () => {
    const document = new DeltaDocument(
      'uri',
      'rich-text',
      1,
      new Delta()
        .insert('Line one.')
        .insert('\n', { para: true })
        .insert('Line two.')
        .insert('\n', { para: true })
        .insert('Line three.')
        .insert('\n', { para: true }),
    );
    document.update(new Delta().retain(5).delete(3).insert('1'), 2);

    expect(document.version).toEqual(2);
    expect(document.getText()).toEqual('Line 1.\nLine two.\nLine three.\n');
    expect(document.offsetAt({ line: 1, character: 0 })).toEqual(8);
    expect(document.offsetAt({ line: 2, character: 0 })).toEqual(18);
  });

  it('add new line', () => {
    const document = new DeltaDocument(
      'uri',
      'rich-text',
      1,
      new Delta()
        .insert('Line one.')
        .insert('\n')
        .insert('Line two.')
        .insert('\n')
        .insert('Line three.\n', { style: 'p' }),
    );
    document.update(new Delta().retain(10).insert('Hello everybody!\n'), 2);

    expect(document.version).toEqual(2);
    expect(document.getText()).toEqual('Line one.\nHello everybody!\nLine two.\nLine three.\n');
    expect(document.offsetAt({ line: 2, character: 0 })).toEqual(27);
    expect(document.offsetAt({ line: 3, character: 0 })).toEqual(37);
  });

  it('add new line with different style', () => {
    const document = new DeltaDocument(
      'uri',
      'rich-text',
      1,
      new Delta().insert('Hello World!').insert('\n').insert('Hello World!').insert('\n'),
    );
    document.update(new Delta().retain(13).insert('Hello everybody!\n', { style: 'p' }), 2);

    expect(document.version).toEqual(2);
    expect(document.getText()).toEqual('Hello World!\nHello everybody!\nHello World!\n');
    expect(document.offsetAt({ line: 2, character: 0 })).toEqual(30);
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
