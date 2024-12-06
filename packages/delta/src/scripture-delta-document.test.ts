import { ScriptureChapter, ScriptureParagraph } from '@sillsdev/lynx';
import Delta from 'quill-delta';
import { describe, expect, it } from 'vitest';

import { ScriptureDeltaDocument } from './scripture-delta-document';

describe('ScriptureDeltaDocument', () => {
  it('create', () => {
    const document = new ScriptureDeltaDocument(
      'uri',
      1,
      new Delta()
        .insert({ chapter: { number: '1', style: 'c' } })
        .insert({ verse: { number: '1', style: 'v' } })
        .insert('Chapter 1, verse 1. ', { segment: 'verse_1_1' })
        .insert('\n', { para: { style: 'p' } })
        .insert({ verse: { number: '2', style: 'v' } })
        .insert('Chapter 1, verse 2.', { segment: 'verse_1_2' })
        .insert('\n', { para: { style: 'p' } }),
    );

    expect(document.children.length).toEqual(3);

    expect(document.children[0]).toBeInstanceOf(ScriptureChapter);
    const book = document.children[0] as ScriptureChapter;
    expect(book.number).toEqual('1');
    expect(book.range).toEqual({ start: { line: 0, character: 0 }, end: { line: 0, character: 1 } });

    expect(document.children[1]).toBeInstanceOf(ScriptureParagraph);
    const paragraph1 = document.children[1] as ScriptureParagraph;
    expect(paragraph1.style).toEqual('p');
    expect(paragraph1.range).toEqual({ start: { line: 1, character: 0 }, end: { line: 1, character: 21 } });

    expect(document.children[2]).toBeInstanceOf(ScriptureParagraph);
    const paragraph2 = document.children[2] as ScriptureParagraph;
    expect(paragraph2.style).toEqual('p');
    expect(paragraph2.range).toEqual({ start: { line: 2, character: 0 }, end: { line: 2, character: 20 } });
  });

  // it('update', () => {
  //   const document = new DeltaScriptureDocument('uri', 1, new Delta().insert('Hello World!').insert('\n'));
  //   document.update(new Delta().retain(6).delete(5).insert('everybody').ops, 2);

  //   expect(document.version).toEqual(2);
  //   expect(document.getText()).toEqual('Hello everybody!\n');
  // });
});
