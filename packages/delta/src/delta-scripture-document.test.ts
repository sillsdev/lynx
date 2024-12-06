import Delta from 'quill-delta';
import { describe, expect, it } from 'vitest';

import { DeltaScriptureDocument } from './delta-scripture-document';

describe('DeltaDocument', () => {
  it('constructor', () => {
    const document = new DeltaScriptureDocument(
      'uri',
      1,
      new Delta()
        .insert({ chapter: { number: '1', style: 'c' } })
        .insert({ verse: { number: '1', style: 'v' } })
        .insert('Chapter 1, verse 1. ', { segment: 'verse_1_1' })
        .insert({ verse: { number: '2', style: 'v' } })
        .insert('Chapter 1, verse 2.', { segment: 'verse_1_2' })
        .insert('\n', { para: { style: 'p' } })
        .insert({ chapter: { number: '2', style: 'c' } })
        .insert({ verse: { number: '1', style: 'v' } })
        .insert('Chapter 2, verse 1. ', { segment: 'verse_2_1' })
        .insert({ verse: { number: '2', style: 'v' } })
        .insert('Chapter 2, verse 2.', { segment: 'verse_2_2' })
        .insert('\n', { para: { style: 'p' } }),
    );

    expect(document.getText()).toEqual('Hello\n\nWorld\uFFFC\n!\n');
  });

  // it('update', () => {
  //   const document = new DeltaScriptureDocument('uri', 1, new Delta().insert('Hello World!').insert('\n'));
  //   document.update(new Delta().retain(6).delete(5).insert('everybody').ops, 2);

  //   expect(document.version).toEqual(2);
  //   expect(document.getText()).toEqual('Hello everybody!\n');
  // });
});
