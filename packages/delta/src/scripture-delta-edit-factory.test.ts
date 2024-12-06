import {
  ScriptureCell,
  ScriptureChapter,
  ScriptureCharacterStyle,
  ScriptureMilestone,
  ScriptureNote,
  ScriptureOptBreak,
  ScriptureParagraph,
  ScriptureRef,
  ScriptureRow,
  ScriptureTable,
  ScriptureText,
  ScriptureVerse,
} from '@sillsdev/lynx';
import Delta from 'quill-delta';
import { describe, expect, it } from 'vitest';

import { ScriptureDeltaDocument } from './scripture-delta-document';
import { ScriptureDeltaEditFactory } from './scripture-delta-edit-factory';

const DOC_CONTENT = new Delta()
  .insert({ chapter: { number: '1', style: 'c' } })
  .insert({ verse: { number: '1', style: 'v' } })
  .insert('This is a test.', { segment: 'verse_1_1' })
  .insert('\n', { para: { style: 'p' } })
  .insert({ verse: { number: '2', style: 'v' } })
  .insert('This is a test.', { segment: 'verse_1_2' })
  .insert('\n', { para: { style: 'p' } });

describe('ScriptureDeltaEditFactory', () => {
  it('text', () => {
    const factory = createFactory();
    const document = new ScriptureDeltaDocument('uri', 'scr-delta', 1, DOC_CONTENT);

    const edit = factory.createScriptureEdit(
      document,
      { start: { line: 2, character: 1 }, end: { line: 2, character: 16 } },
      new ScriptureText('Hello, world!'),
    );

    expect(edit).toEqual([{ retain: 19 }, { insert: 'Hello, world!' }, { delete: 15 }]);
  });

  it('note', () => {
    const factory = createFactory();
    const document = new ScriptureDeltaDocument('uri', 'scr-delta', 1, DOC_CONTENT);

    const edit = factory.createScriptureEdit(
      document,
      { start: { line: 1, character: 16 }, end: { line: 1, character: 16 } },
      new ScriptureNote('f', '+', undefined, [new ScriptureText('Footnote.')]),
    );

    expect(edit).toEqual([
      { retain: 17 },
      { insert: { note: { style: 'f', caller: '+', contents: { ops: [{ insert: 'Footnote.' }] } } } },
    ]);
  });

  it('ref', () => {
    const factory = createFactory();
    const document = new ScriptureDeltaDocument('uri', 'scr-delta', 1, DOC_CONTENT);

    const edit = factory.createScriptureEdit(
      document,
      { start: { line: 1, character: 16 }, end: { line: 1, character: 16 } },
      new ScriptureRef('1.18', 'MAT 1:18'),
    );

    expect(edit).toEqual([{ retain: 17 }, { insert: '1.18', attributes: { ref: { loc: 'MAT 1:18' } } }]);
  });

  it('milestone', () => {
    const factory = createFactory();
    const document = new ScriptureDeltaDocument('uri', 'scr-delta', 1, DOC_CONTENT);

    const edit = factory.createScriptureEdit(
      document,
      { start: { line: 1, character: 1 }, end: { line: 1, character: 16 } },
      [
        new ScriptureMilestone('qt1-s', true, 'qt1 1:1', undefined, { who: 'Pilate' }),
        new ScriptureText('Are you the king of the Jews?'),
        new ScriptureMilestone('qt1-e', false, undefined, 'qt1 1:1'),
      ],
    );

    expect(edit).toEqual([
      { retain: 2 },
      { insert: { ms: { style: 'qt1-s', sid: 'qt1 1:1', who: 'Pilate' } } },
      { insert: 'Are you the king of the Jews?' },
      { insert: { ms: { style: 'qt1-e', eid: 'qt1 1:1' } } },
      { delete: 15 },
    ]);
  });

  it('paragraph', () => {
    const factory = createFactory();
    const document = new ScriptureDeltaDocument('uri', 'scr-delta', 1, DOC_CONTENT);

    const edit = factory.createScriptureEdit(
      document,
      { start: { line: 3, character: 0 }, end: { line: 3, character: 0 } },
      new ScriptureParagraph('p', undefined, [new ScriptureVerse('3'), new ScriptureText('This is verse three.')]),
    );

    expect(edit).toEqual([
      { retain: 35 },
      { insert: { verse: { number: '3', style: 'v' } } },
      { insert: 'This is verse three.' },
      { insert: '\n', attributes: { para: { style: 'p' } } },
    ]);
  });

  it('nested character style', () => {
    const factory = createFactory();
    const document = new ScriptureDeltaDocument('uri', 'scr-delta', 1, DOC_CONTENT);

    const edit = factory.createScriptureEdit(
      document,
      { start: { line: 1, character: 1 }, end: { line: 1, character: 16 } },
      new ScriptureCharacterStyle('add', undefined, [
        new ScriptureText('an addition containing the word '),
        new ScriptureCharacterStyle('nd', undefined, [new ScriptureText('Lord')]),
      ]),
    );

    expect(edit).toEqual([
      { retain: 2 },
      { insert: 'an addition containing the word ', attributes: { char: { style: 'add', cid: '0' } } },
      {
        insert: 'Lord',
        attributes: {
          char: [
            { style: 'add', cid: '0' },
            { style: 'nd', cid: '1' },
          ],
        },
      },
      { delete: 15 },
    ]);
  });

  it('attributes', () => {
    const factory = createFactory();
    const document = new ScriptureDeltaDocument('uri', 'scr-delta', 1, DOC_CONTENT);

    const edit = factory.createScriptureEdit(
      document,
      { start: { line: 1, character: 1 }, end: { line: 1, character: 16 } },
      new ScriptureCharacterStyle('fig', { src: 'avnt016.jpg', size: 'span', ref: '1.18' }, [
        new ScriptureText('At once they left their nets.'),
      ]),
    );

    expect(edit).toEqual([
      { retain: 2 },
      {
        insert: 'At once they left their nets.',
        attributes: { char: { style: 'fig', src: 'avnt016.jpg', size: 'span', ref: '1.18', cid: '0' } },
      },
      { delete: 15 },
    ]);
  });

  it('chapter and verse', () => {
    const factory = createFactory();
    const document = new ScriptureDeltaDocument('uri', 'scr-delta', 1, DOC_CONTENT);

    const edit = factory.createScriptureEdit(
      document,
      { start: { line: 3, character: 0 }, end: { line: 3, character: 0 } },
      [
        new ScriptureChapter('2'),
        new ScriptureParagraph('p', undefined, [new ScriptureVerse('1'), new ScriptureText('This is a verse.')]),
      ],
    );

    expect(edit).toEqual([
      { retain: 35 },
      { insert: { chapter: { number: '2', style: 'c' } } },
      { insert: { verse: { number: '1', style: 'v' } } },
      { insert: 'This is a verse.' },
      { insert: '\n', attributes: { para: { style: 'p' } } },
    ]);
  });

  it('table', () => {
    const factory = createFactory();
    const document = new ScriptureDeltaDocument('uri', 'scr-delta', 1, DOC_CONTENT);

    expect(() =>
      factory.createScriptureEdit(
        document,
        { start: { line: 3, character: 0 }, end: { line: 3, character: 0 } },
        new ScriptureTable([
          new ScriptureRow([
            new ScriptureCell('th1', 'start', 1, [new ScriptureText('Tribe ')]),
            new ScriptureCell('th2', 'start', 1, [new ScriptureText('Leader ')]),
            new ScriptureCell('thr3', 'end', 1, [new ScriptureText('Number')]),
          ]),
          new ScriptureRow([
            new ScriptureCell('tc1', 'start', 1, [new ScriptureText('Reuben ')]),
            new ScriptureCell('tc2', 'start', 1, [new ScriptureText('Elizur son of Shedeur ')]),
            new ScriptureCell('tcr3', 'end', 1, [new ScriptureText('46,500')]),
          ]),
          new ScriptureRow([
            new ScriptureCell('tc1', 'start', 1, [new ScriptureText('Simeon ')]),
            new ScriptureCell('tc2', 'start', 1, [new ScriptureText('Shelumiel son of Zurishaddai ')]),
            new ScriptureCell('tcr3', 'end', 1, [new ScriptureText('59,300')]),
          ]),
          new ScriptureRow([
            new ScriptureCell('tcr1', 'end', 2, [new ScriptureText('Total: ')]),
            new ScriptureCell('tcr3', 'end', 1, [new ScriptureText('151,450')]),
          ]),
        ]),
      ),
    ).toThrowError('Unsupported node type: table.');
  });

  it('optbreak', () => {
    const factory = createFactory();
    const document = new ScriptureDeltaDocument('uri', 'scr-delta', 1, DOC_CONTENT);

    const edit = factory.createScriptureEdit(
      document,
      { start: { line: 2, character: 5 }, end: { line: 2, character: 5 } },
      new ScriptureOptBreak(),
    );

    expect(edit).toEqual([{ retain: 23 }, { insert: { optbreak: {} } }]);
  });
});

function createFactory(): ScriptureDeltaEditFactory {
  let counter = 0;
  return new ScriptureDeltaEditFactory(() => (counter++).toString());
}
