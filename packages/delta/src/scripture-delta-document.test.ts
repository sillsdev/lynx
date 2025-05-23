import {
  ScriptureCell,
  ScriptureChapter,
  ScriptureParagraph,
  ScriptureRow,
  ScriptureTable,
  ScriptureText,
} from '@sillsdev/lynx';
import Delta from 'quill-delta';
import { describe, expect, it } from 'vitest';

import { ScriptureDeltaDocument } from './scripture-delta-document';

describe('ScriptureDeltaDocument', () => {
  it('paragraph', () => {
    const document = new ScriptureDeltaDocument(
      'uri',
      'scr-delta',
      1,
      new Delta()
        .insert({ chapter: { number: '1', style: 'c' } })
        .insert({ verse: { number: '1', style: 'v' } })
        .insert('This is a test.', { segment: 'verse_1_1' })
        .insert('\n', { para: { style: 'p' } })
        .insert({ verse: { number: '2', style: 'v' } })
        .insert('This is a test.', { segment: 'verse_1_2' })
        .insert('\n', { para: { style: 'p' } }),
    );

    expect(document.children.length).toEqual(3);

    expect(document.children[0]).toBeInstanceOf(ScriptureChapter);
    const book = document.children[0] as ScriptureChapter;
    expect(book.number).toEqual('1');
    expect(book.range).toEqual({ start: { line: 0, character: 0 }, end: { line: 1, character: 0 } });

    expect(document.children[1]).toBeInstanceOf(ScriptureParagraph);
    const paragraph1 = document.children[1] as ScriptureParagraph;
    expect(paragraph1.style).toEqual('p');
    expect(paragraph1.range).toEqual({ start: { line: 1, character: 0 }, end: { line: 2, character: 0 } });

    expect(document.children[2]).toBeInstanceOf(ScriptureParagraph);
    const paragraph2 = document.children[2] as ScriptureParagraph;
    expect(paragraph2.style).toEqual('p');
    expect(paragraph2.range).toEqual({ start: { line: 2, character: 0 }, end: { line: 3, character: 0 } });
  });

  it('table', () => {
    const document = new ScriptureDeltaDocument(
      'uri',
      'src-delta',
      1,
      new Delta()
        .insert({ chapter: { number: '1', style: 'c' } })
        .insert('Before verse.', { segment: 'cell_1_1_1' })
        .insert({ verse: { number: '1', style: 'v' } })
        .insert('This is verse ', { segment: 'verse_1_1' })
        .insert('1', { char: { cid: '123', style: 'it' }, segment: 'verse_1_1' })
        .insert('.', { segment: 'verse_1_1' })
        .insert('\n', { table: { id: 'table_1' }, row: { id: 'row_1' }, cell: { style: 'tc1', align: 'start' } })
        .insert({ blank: true }, { segment: 'cell_1_1_2' })
        .insert({ verse: { number: '2', style: 'v' } })
        .insert('This is verse 2.', { segment: 'verse_1_2' })
        .insert('\n', { table: { id: 'table_1' }, row: { id: 'row_1' }, cell: { style: 'tc2', align: 'start' } })
        .insert({ blank: true }, { segment: 'cell_1_2_1' })
        .insert('\n', { table: { id: 'table_1' }, row: { id: 'row_2' }, cell: { style: 'tc1', align: 'start' } })
        .insert({ blank: true }, { segment: 'cell_1_2_2' })
        .insert({ verse: { number: '3', style: 'v' } })
        .insert('This is verse 3.', { segment: 'verse_1_3' })
        .insert('\n', { table: { id: 'table_1' }, row: { id: 'row_2' }, cell: { style: 'tc2', align: 'start' } }),
    );

    expect(document.children.length).toEqual(2);

    expect(document.children[1]).toBeInstanceOf(ScriptureTable);
    const table = document.children[1] as ScriptureTable;
    expect(table.children.length).toEqual(2);
    expect(table.children[0]).toBeInstanceOf(ScriptureRow);
    const row1 = table.children[0] as ScriptureRow;
    expect(row1.children.length).toEqual(2);
    expect(row1.children[1]).toBeInstanceOf(ScriptureCell);
    const cell12 = row1.children[1] as ScriptureCell;
    expect(cell12.getText()).toEqual('\ufffc\ufffcThis is verse 2.\n');
    expect(table.children[1]).toBeInstanceOf(ScriptureRow);
    const row2 = table.children[1] as ScriptureRow;
    expect(row2.children.length).toEqual(2);
    expect(row2.children[0]).toBeInstanceOf(ScriptureCell);
    const cell21 = row2.children[0] as ScriptureCell;
    expect(cell21.getText()).toEqual('\ufffc\n');
  });

  it('collapses adjacent newlines', () => {
    const document = new ScriptureDeltaDocument(
      'uri',
      'scr-delta',
      1,
      new Delta()
        .insert({ chapter: { number: '1', style: 'c' } })
        .insert({ blank: true }, { segment: 'p_1' })
        .insert({ verse: { number: '1', style: 'v' } })
        .insert('Verse text.', { segment: 'verse_1_1' })
        .insert('\n', { para: { style: 'p' } })
        .insert('\n\n'),
    );

    expect(document.children.length).toEqual(2);
    const paragraph1 = document.children[1];
    expect(paragraph1.getText()).toEqual(`\ufffc\ufffcVerse text.\n`);
  });

  it('no paragraph', () => {
    const document = new ScriptureDeltaDocument(
      'uri',
      'scr-delta',
      1,
      new Delta()
        .insert({ chapter: { number: '1', style: 'c' } })
        .insert({ verse: { number: '1', style: 'v' } })
        .insert('This is verse 1.', { segment: 'verse_1_1' })
        .insert({ verse: { number: '2', style: 'v' } })
        .insert({ blank: true }, { segment: 'verse_1_2' })
        .insert({ verse: { number: '3', style: 'v' } })
        .insert('This is verse 3.', { segment: 'verse_1_3' })
        .insert('\n'),
    );

    expect(document.children.length).toEqual(2);
    expect(document.children[1]).toBeInstanceOf(ScriptureParagraph);
    const paragraph1 = document.children[1] as ScriptureParagraph;
    expect(paragraph1.style).toEqual('p');
    expect(paragraph1.getText()).toEqual(`\ufffcThis is verse 1.\ufffc\ufffc\ufffcThis is verse 3.\n`);
    expect(paragraph1.range).toEqual({ start: { line: 1, character: 0 }, end: { line: 2, character: 0 } });
  });

  it('update single line in a paragraph', () => {
    const document = new ScriptureDeltaDocument(
      'uri',
      'scr-delta',
      1,
      new Delta()
        .insert({ chapter: { number: '1', style: 'c' } })
        .insert({ verse: { number: '1', style: 'v' } })
        .insert('This is a test.', { segment: 'verse_1_1' })
        .insert('\n', { para: { style: 'p' } })
        .insert({ verse: { number: '2', style: 'v' } })
        .insert('This is a test.', { segment: 'verse_1_2' })
        .insert('\n', { para: { style: 'p' } }),
    );

    document.update(new Delta().retain(16).insert(' again', { segment: 'verse_1_1' }), 2);

    expect(document.children.length).toEqual(3);

    expect(document.children[1]).toBeInstanceOf(ScriptureParagraph);
    const paragraph1 = document.children[1] as ScriptureParagraph;
    expect(paragraph1.style).toEqual('p');
    expect(paragraph1.children[1]).toBeInstanceOf(ScriptureText);
    const text1 = paragraph1.children[1] as ScriptureText;
    expect(text1.text).toEqual('This is a test again.');
    expect(text1.range).toEqual({ start: { line: 1, character: 1 }, end: { line: 1, character: 22 } });
    expect(document.children[2].getText()).toEqual(`\ufffcThis is a test.\n`);
  });

  it('add new paragraph', () => {
    const document = new ScriptureDeltaDocument(
      'uri',
      'scr-delta',
      1,
      new Delta()
        .insert({ chapter: { number: '1', style: 'c' } })
        .insert({ verse: { number: '1', style: 'v' } })
        .insert('This is a test.', { segment: 'verse_1_1' })
        .insert('\n', { para: { style: 'p' } })
        .insert({ verse: { number: '2', style: 'v' } })
        .insert('This is a test.', { segment: 'verse_1_2' })
        .insert('\n', { para: { style: 'p' } }),
    );

    document.update(
      new Delta()
        .retain(18)
        .insert('section header.', { segment: 's_1' })
        .insert('\n', { para: { style: 's' } }),
      2,
    );

    expect(document.children.length).toEqual(4);

    const paragraph2 = document.children[2];
    expect(paragraph2.getText()).toEqual(`section header.\n`);
    expect(paragraph2.range).toEqual({ start: { line: 2, character: 0 }, end: { line: 3, character: 0 } });

    const paragraph3 = document.children[3];
    expect(paragraph3.getText()).toEqual(`\ufffcThis is a test.\n`);
    expect(paragraph3.range).toEqual({ start: { line: 3, character: 0 }, end: { line: 4, character: 0 } });
  });

  it('add verse at end of a paragraph', () => {
    const document = new ScriptureDeltaDocument(
      'uri',
      'scr-delta',
      1,
      new Delta()
        .insert({ chapter: { number: '1', style: 'c' } })
        .insert({ verse: { number: '1', style: 'v' } })
        .insert('This is a test.', { segment: 'verse_1_1' })
        .insert('\n', { para: { style: 'p' } })
        .insert({ verse: { number: '2', style: 'v' } })
        .insert('This is a test.', { segment: 'verse_1_2' })
        .insert('\n', { para: { style: 'p' } }),
    );

    document.update(
      new Delta()
        .retain(17)
        .insert({ verse: { number: '1a', style: 'v' } })
        .insert('This is a new verse.', { segment: 'verse_1_1a' }),
      2,
    );

    expect(document.children.length).toEqual(3);

    const paragraph1 = document.children[1];
    expect(paragraph1.getText()).toEqual(`\ufffcThis is a test.\ufffcThis is a new verse.\n`);
    expect(paragraph1.range).toEqual({ start: { line: 1, character: 0 }, end: { line: 2, character: 0 } });

    const paragraph2 = document.children[2];
    expect(paragraph2.getText()).toEqual(`\ufffcThis is a test.\n`);
    expect(paragraph2.range).toEqual({ start: { line: 2, character: 0 }, end: { line: 3, character: 0 } });
  });

  it('update multiple paragraphs', () => {
    const document = new ScriptureDeltaDocument(
      'uri',
      'scr-delta',
      1,
      new Delta()
        .insert({ chapter: { number: '1', style: 'c' } })
        .insert({ verse: { number: '1', style: 'v' } })
        .insert('This is a test.', { segment: 'verse_1_1' })
        .insert('\n', { para: { style: 'p' } })
        .insert({ verse: { number: '2', style: 'v' } })
        .insert('This is a test.', { segment: 'verse_1_2' })
        .insert('\n', { para: { style: 'p' } }),
    );

    document.update(
      new Delta()
        .retain(10)
        .delete(17)
        .insert('verse one.', { segment: 'verse_1_1' })
        .insert('\n', { para: { style: 'p' } })
        .insert({ verse: { number: '2', style: 'v' } })
        .insert('This is not ', { segment: 'verse_1_2' }),
      2,
    );

    expect(document.children.length).toEqual(3);

    const paragraph1 = document.children[1];
    expect(paragraph1.getText()).toEqual(`\ufffcThis is verse one.\n`);
    expect(paragraph1.range).toEqual({ start: { line: 1, character: 0 }, end: { line: 2, character: 0 } });

    const paragraph2 = document.children[2];
    expect(paragraph2.getText()).toEqual(`\ufffcThis is not a test.\n`);
    expect(paragraph2.range).toEqual({ start: { line: 2, character: 0 }, end: { line: 3, character: 0 } });
  });

  it('update no paragraph', () => {
    const document = new ScriptureDeltaDocument(
      'uri',
      'scr-delta',
      1,
      new Delta()
        .insert({ chapter: { number: '1', style: 'c' } })
        .insert({ verse: { number: '1', style: 'v' } })
        .insert('This is verse 1.', { segment: 'verse_1_1' })
        .insert({ verse: { number: '2', style: 'v' } })
        .insert({ blank: true }, { segment: 'verse_1_2' })
        .insert({ verse: { number: '3', style: 'v' } })
        .insert('This is verse 3.', { segment: 'verse_1_3' })
        .insert('\n'),
    );

    document.update(new Delta().retain(16).delete(1).insert('one'), 2);

    expect(document.children.length).toEqual(2);
    expect(document.children[1]).toBeInstanceOf(ScriptureParagraph);
    const paragraph1 = document.children[1] as ScriptureParagraph;
    expect(paragraph1.style).toEqual('p');
    expect(paragraph1.getText()).toEqual(`\ufffcThis is verse one.\ufffc\ufffc\ufffcThis is verse 3.\n`);
    expect(paragraph1.range).toEqual({ start: { line: 1, character: 0 }, end: { line: 2, character: 0 } });
  });

  it('update style only', () => {
    const document = new ScriptureDeltaDocument(
      'uri',
      'scr-delta',
      1,
      new Delta()
        .insert({ chapter: { number: '1', style: 'c' } })
        .insert({ verse: { number: '1', style: 'v' } })
        .insert('This is a test.', { segment: 'verse_1_1' })
        .insert('\n', { para: { style: 'p' } })
        .insert({ verse: { number: '2', style: 'v' } })
        .insert('This is a test.', { segment: 'verse_1_2' })
        .insert('\n', { para: { style: 'p' } })
        .insert({ verse: { number: '3', style: 'v' } })
        .insert('This is a test.', { segment: 'verse_1_3' })
        .insert('\n', { para: { style: 'p' } }),
    );

    document.update(new Delta().retain(2).retain(4, { char: { cid: '123', style: 'it' } }), 2);

    expect(document.offsetAt({ line: 1, character: 0 })).toEqual(1);
    expect(document.offsetAt({ line: 2, character: 0 })).toEqual(18);
    expect(document.offsetAt({ line: 3, character: 0 })).toEqual(35);
  });

  it('delete only', () => {
    const document = new ScriptureDeltaDocument(
      'uri',
      'scr-delta',
      1,
      new Delta()
        .insert({ chapter: { number: '1', style: 'c' } })
        .insert({ verse: { number: '1', style: 'v' } })
        .insert('This is a test.', { segment: 'verse_1_1' })
        .insert('\n', { para: { style: 'p' } })
        .insert({ verse: { number: '2', style: 'v' } })
        .insert('This is a test.', { segment: 'verse_1_2' })
        .insert('\n', { para: { style: 'p' } })
        .insert({ verse: { number: '3', style: 'v' } })
        .insert('This is a test.', { segment: 'verse_1_3' })
        .insert('\n', { para: { style: 'p' } }),
    );

    document.update(new Delta().retain(2).delete(4), 2);

    expect(document.offsetAt({ line: 1, character: 0 })).toEqual(1);
    expect(document.offsetAt({ line: 2, character: 0 })).toEqual(14);
    expect(document.offsetAt({ line: 3, character: 0 })).toEqual(31);
  });

  it('empty change', () => {
    const document = new ScriptureDeltaDocument(
      'uri',
      'scr-delta',
      1,
      new Delta()
        .insert({ chapter: { number: '1', style: 'c' } })
        .insert({ verse: { number: '1', style: 'v' } })
        .insert('This is a test.', { segment: 'verse_1_1' })
        .insert('\n', { para: { style: 'p' } })
        .insert({ verse: { number: '2', style: 'v' } })
        .insert('This is a test.', { segment: 'verse_1_2' })
        .insert('\n', { para: { style: 'p' } }),
    );

    document.update(new Delta(), 2);

    expect(document.children.length).toEqual(3);

    expect(document.children[0].getText()).toEqual(`\ufffc`);
    expect(document.children[1].getText()).toEqual(`\ufffcThis is a test.\n`);
    expect(document.children[2].getText()).toEqual(`\ufffcThis is a test.\n`);
  });

  it('update last paragraph attributes', () => {
    const document = new ScriptureDeltaDocument(
      'uri',
      'scr-delta',
      1,
      new Delta()
        .insert({ chapter: { number: '1', style: 'c' } })
        .insert({ verse: { number: '1', style: 'v' } })
        .insert({ blank: true }, { segment: 'verse_1_1' })
        .insert({ verse: { number: '2', style: 'v' } })
        .insert({ blank: true }, { segment: 'verse_1_2' })
        .insert('\n'),
    );

    document.update(
      new Delta()
        .retain(2)
        .insert('Verse one.')
        .delete(1)
        .retain(1)
        .insert('Verse two.')
        .delete(1)
        .retain(1, { para: { style: 'p' } }),
      2,
    );

    expect(document.children.length).toEqual(2);

    expect(document.children[1]).toBeInstanceOf(ScriptureParagraph);
    const paragraph1 = document.children[1] as ScriptureParagraph;
    expect(paragraph1.style).toEqual('p');
    expect(paragraph1.getText()).toEqual(`\ufffcVerse one.\ufffcVerse two.\n`);
    expect(paragraph1.range).toEqual({ start: { line: 1, character: 0 }, end: { line: 2, character: 0 } });
  });
});
