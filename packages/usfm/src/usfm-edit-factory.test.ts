import {
  ScriptureCell,
  ScriptureChapter,
  ScriptureCharacterStyle,
  ScriptureParagraph,
  ScriptureRow,
  ScriptureTable,
  ScriptureText,
  ScriptureVerse,
} from '@sillsdev/lynx';
import { UsfmStylesheet } from '@sillsdev/machine/corpora';
import { describe, expect, it } from 'vitest';

import { UsfmDocument } from './usfm-document';
import { UsfmEditFactory } from './usfm-edit-factory';

const DOC_USFM = `\\id MAT
\\c 1

\\p
\\v 1 This is a test.
\\p
\\v 2 This is a test.
`;

describe('UsfmEditFactory', () => {
  it('single paragraph', () => {
    const stylesheet = new UsfmStylesheet('usfm.sty');
    const document = new UsfmDocument('uri', 'usfm', 1, DOC_USFM, stylesheet);
    const factory = new UsfmEditFactory(stylesheet);
    const edit = factory.createScriptureEdit(
      document,
      { start: { line: 7, character: 0 }, end: { line: 7, character: 0 } },
      new ScriptureParagraph('p', undefined, [new ScriptureVerse('1'), new ScriptureText('This is verse three.')]),
    );

    expect(edit).toEqual([
      {
        range: { start: { line: 7, character: 0 }, end: { line: 7, character: 0 } },
        newText: '\\p\r\n\\v 1 This is verse three. ',
      },
    ]);
  });

  it('multiple paragraphs', () => {
    const stylesheet = new UsfmStylesheet('usfm.sty');
    const document = new UsfmDocument('uri', 'usfm', 1, DOC_USFM, stylesheet);
    const factory = new UsfmEditFactory(stylesheet);
    const edit = factory.createScriptureEdit(
      document,
      { start: { line: 7, character: 0 }, end: { line: 7, character: 0 } },
      [
        new ScriptureParagraph('p', undefined, [new ScriptureText('This is a paragraph.')]),
        new ScriptureParagraph('p', undefined, [new ScriptureText('This is another paragraph.')]),
      ],
    );

    expect(edit).toEqual([
      {
        range: { start: { line: 7, character: 0 }, end: { line: 7, character: 0 } },
        newText: '\\p This is a paragraph.\r\n\\p This is another paragraph. ',
      },
    ]);
  });

  it('nested character style', () => {
    const stylesheet = new UsfmStylesheet('usfm.sty');
    const document = new UsfmDocument('uri', 'usfm', 1, DOC_USFM, stylesheet);
    const factory = new UsfmEditFactory(stylesheet);
    const edit = factory.createScriptureEdit(
      document,
      { start: { line: 4, character: 5 }, end: { line: 4, character: 20 } },
      new ScriptureCharacterStyle('add', undefined, [
        new ScriptureText('an addition containing the word '),
        new ScriptureCharacterStyle('nd', undefined, [new ScriptureText('Lord')]),
      ]),
    );

    expect(edit).toEqual([
      {
        range: { start: { line: 4, character: 5 }, end: { line: 4, character: 20 } },
        newText: '\\add an addition containing the word \\+nd Lord\\+nd*\\add*',
      },
    ]);
  });

  it('attributes', () => {
    const stylesheet = new UsfmStylesheet('usfm.sty');
    const document = new UsfmDocument('uri', 'usfm', 1, DOC_USFM, stylesheet);
    const factory = new UsfmEditFactory(stylesheet);
    const edit = factory.createScriptureEdit(
      document,
      { start: { line: 4, character: 5 }, end: { line: 4, character: 20 } },
      new ScriptureCharacterStyle('fig', { src: 'avnt016.jpg', size: 'span', ref: '1.18' }, [
        new ScriptureText('At once they left their nets.'),
      ]),
    );

    expect(edit).toEqual([
      {
        range: { start: { line: 4, character: 5 }, end: { line: 4, character: 20 } },
        newText: '\\fig At once they left their nets.|src="avnt016.jpg" size="span" ref="1.18"\\fig*',
      },
    ]);
  });

  it('default attribute', () => {
    const stylesheet = new UsfmStylesheet('usfm.sty');
    const document = new UsfmDocument('uri', 'usfm', 1, DOC_USFM, stylesheet);
    const factory = new UsfmEditFactory(stylesheet);
    const edit = factory.createScriptureEdit(
      document,
      { start: { line: 4, character: 5 }, end: { line: 4, character: 20 } },
      new ScriptureCharacterStyle('w', { lemma: 'grace' }, [new ScriptureText('gracious')]),
    );

    expect(edit).toEqual([
      {
        range: { start: { line: 4, character: 5 }, end: { line: 4, character: 20 } },
        newText: '\\w gracious|grace\\w*',
      },
    ]);
  });

  it('chapter and verse', () => {
    const stylesheet = new UsfmStylesheet('usfm.sty');
    const document = new UsfmDocument('uri', 'usfm', 1, DOC_USFM, stylesheet);
    const factory = new UsfmEditFactory(stylesheet);
    const edit = factory.createScriptureEdit(
      document,
      { start: { line: 7, character: 0 }, end: { line: 7, character: 0 } },
      [
        new ScriptureChapter('2'),
        new ScriptureParagraph('p', undefined, [new ScriptureVerse('1'), new ScriptureText('This is a verse.')]),
      ],
    );

    expect(edit).toEqual([
      {
        range: { start: { line: 7, character: 0 }, end: { line: 7, character: 0 } },
        newText: '\\c 2\r\n\\p\r\n\\v 1 This is a verse. ',
      },
    ]);
  });

  it('table', () => {
    const stylesheet = new UsfmStylesheet('usfm.sty');
    const document = new UsfmDocument('uri', 'usfm', 1, DOC_USFM, stylesheet);
    const factory = new UsfmEditFactory(stylesheet);
    const edit = factory.createScriptureEdit(
      document,
      { start: { line: 7, character: 0 }, end: { line: 7, character: 0 } },
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
    );

    expect(edit).toEqual([
      {
        range: { start: { line: 7, character: 0 }, end: { line: 7, character: 0 } },
        newText:
          '\\tr \\th1 Tribe \\th2 Leader \\thr3 Number\r\n' +
          '\\tr \\tc1 Reuben \\tc2 Elizur son of Shedeur \\tcr3 46,500\r\n' +
          '\\tr \\tc1 Simeon \\tc2 Shelumiel son of Zurishaddai \\tcr3 59,300\r\n' +
          '\\tr \\tcr1-2 Total: \\tcr3 151,450 ',
      },
    ]);
  });
});
