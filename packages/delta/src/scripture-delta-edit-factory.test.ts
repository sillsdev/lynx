import { ScriptureNote, ScriptureParagraph, ScriptureText, ScriptureVerse } from '@sillsdev/lynx';
import Delta from 'quill-delta';
import { describe, expect, it } from 'vitest';

import { ScriptureDeltaDocument } from './scripture-delta-document';
import { ScriptureDeltaEditFactory } from './scripture-delta-edit-factory';

describe('ScriptureDeltaEditFactory', () => {
  it('text', () => {
    const factory = new ScriptureDeltaEditFactory();
    const document = new ScriptureDeltaDocument(
      'uri',
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

    const edit = factory.createScriptureEdit(
      document,
      { start: { line: 2, character: 1 }, end: { line: 2, character: 16 } },
      new ScriptureText('Hello, world!'),
    );

    expect(edit).toEqual([{ retain: 19 }, { insert: 'Hello, world!' }, { delete: 15 }]);
  });

  it('note', () => {
    const factory = new ScriptureDeltaEditFactory();
    const document = new ScriptureDeltaDocument(
      'uri',
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

  it('paragraph', () => {
    const factory = new ScriptureDeltaEditFactory();
    const document = new ScriptureDeltaDocument(
      'uri',
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
});
