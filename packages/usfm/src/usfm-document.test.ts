import { ScriptureBook, ScriptureParagraph, ScriptureText } from '@sillsdev/lynx';
import { UsfmStylesheet } from '@sillsdev/machine/corpora';
import { describe, expect, it } from 'vitest';

import { UsfmDocument } from './usfm-document';

describe('UsfmDocument', () => {
  it('create', () => {
    const stylesheet = new UsfmStylesheet('usfm.sty');
    const usfm = `\\id MAT
\\c 1

\\p
\\v 1 This is a test.
\\p
\\v 2 This is a test.
`;
    const document = new UsfmDocument('uri', 1, usfm, stylesheet);

    expect(document.children.length).toEqual(4);

    expect(document.children[0]).toBeInstanceOf(ScriptureBook);
    const book = document.children[0] as ScriptureBook;
    expect(book.code).toEqual('MAT');
    expect(book.range).toEqual({ start: { line: 0, character: 0 }, end: { line: 0, character: 7 } });

    expect(document.children[2]).toBeInstanceOf(ScriptureParagraph);
    const paragraph1 = document.children[2] as ScriptureParagraph;
    expect(paragraph1.style).toEqual('p');
    expect(paragraph1.range).toEqual({ start: { line: 3, character: 0 }, end: { line: 4, character: 20 } });

    expect(document.children[3]).toBeInstanceOf(ScriptureParagraph);
    const paragraph2 = document.children[3] as ScriptureParagraph;
    expect(paragraph2.style).toEqual('p');
    expect(paragraph2.range).toEqual({ start: { line: 5, character: 0 }, end: { line: 6, character: 20 } });
  });

  it('update full document', () => {
    const stylesheet = new UsfmStylesheet('usfm.sty');
    const usfm = `\\id MAT
\\c 1

\\p
\\v 1 This is a test.
\\p
\\v 2 This is a test.
`;
    const document = new UsfmDocument('uri', 1, usfm, stylesheet);

    expect(document.children.length).toEqual(4);

    document.update(
      [
        {
          text: `\\id MRK
\\c 1
\\p
\\v 1 This is verse one.
`,
        },
      ],
      2,
    );

    expect(document.children.length).toEqual(3);

    expect(document.children[0]).toBeInstanceOf(ScriptureBook);
    const book = document.children[0] as ScriptureBook;
    expect(book.code).toEqual('MRK');
    expect(book.range).toEqual({ start: { line: 0, character: 0 }, end: { line: 0, character: 7 } });

    expect(document.children[2]).toBeInstanceOf(ScriptureParagraph);
    const paragraph1 = document.children[2] as ScriptureParagraph;
    expect(paragraph1.style).toEqual('p');
    expect(paragraph1.range).toEqual({ start: { line: 2, character: 0 }, end: { line: 3, character: 23 } });

    expect(paragraph1.children[1]).toBeInstanceOf(ScriptureText);
    const text1 = paragraph1.children[1] as ScriptureText;
    expect(text1.text).toEqual('This is verse one.');
    expect(text1.range).toEqual({ start: { line: 3, character: 5 }, end: { line: 3, character: 23 } });
  });

  it('update single line in a paragraph', () => {
    const stylesheet = new UsfmStylesheet('usfm.sty');
    const usfm = `\\id MAT
\\c 1

\\p
\\v 1 This is a test.
\\p
\\v 2 This is a test.
`;
    const document = new UsfmDocument('uri', 1, usfm, stylesheet);

    document.update(
      [{ range: { start: { line: 4, character: 15 }, end: { line: 4, character: 19 } }, text: 'test again' }],
      2,
    );

    expect(document.children.length).toEqual(4);

    expect(document.children[2]).toBeInstanceOf(ScriptureParagraph);
    const paragraph1 = document.children[2] as ScriptureParagraph;
    expect(paragraph1.style).toEqual('p');
    expect(paragraph1.children[1]).toBeInstanceOf(ScriptureText);
    const text1 = paragraph1.children[1] as ScriptureText;
    expect(text1.text).toEqual('This is a test again.');
    expect(text1.range).toEqual({ start: { line: 4, character: 5 }, end: { line: 4, character: 26 } });
    expect(document.children[3].getText()).toEqual(`\\p
\\v 2 This is a test.`);
  });

  it('add new paragraph', () => {
    const stylesheet = new UsfmStylesheet('usfm.sty');
    const usfm = `\\id MAT
\\c 1

\\p
\\v 1 This is a test.
\\p
\\v 2 This is a test.`;
    const document = new UsfmDocument('uri', 1, usfm, stylesheet);

    document.update(
      [
        {
          range: { start: { line: 5, character: 0 }, end: { line: 5, character: 0 } },
          text: '\\s section header.\n',
        },
      ],
      2,
    );

    expect(document.children.length).toEqual(5);

    const paragraph2 = document.children[3];
    expect(paragraph2.getText()).toEqual(`\\s section header.`);
    expect(paragraph2.range).toEqual({ start: { line: 5, character: 0 }, end: { line: 5, character: 18 } });

    const paragraph3 = document.children[4];
    expect(paragraph3.getText()).toEqual(`\\p\n\\v 2 This is a test.`);
    expect(paragraph3.range).toEqual({ start: { line: 6, character: 0 }, end: { line: 7, character: 20 } });
  });

  it('add line at end of a paragraph', () => {
    const stylesheet = new UsfmStylesheet('usfm.sty');
    const usfm = `\\id MAT
\\c 1

\\p
\\v 1 This is a test.
\\p
\\v 2 This is a test.`;
    const document = new UsfmDocument('uri', 1, usfm, stylesheet);

    document.update(
      [
        {
          range: { start: { line: 5, character: 0 }, end: { line: 5, character: 0 } },
          text: '\\v 1a This is a new verse.\n',
        },
      ],
      2,
    );

    expect(document.children.length).toEqual(4);

    const paragraph1 = document.children[2];
    expect(paragraph1.getText()).toEqual(`\\p\n\\v 1 This is a test.\n\\v 1a This is a new verse.`);
    expect(paragraph1.range).toEqual({ start: { line: 3, character: 0 }, end: { line: 5, character: 26 } });

    const paragraph2 = document.children[3];
    expect(paragraph2.getText()).toEqual(`\\p\n\\v 2 This is a test.`);
    expect(paragraph2.range).toEqual({ start: { line: 6, character: 0 }, end: { line: 7, character: 20 } });
  });

  it('update multiple paragraphs', () => {
    const stylesheet = new UsfmStylesheet('usfm.sty');
    const usfm = `\\id MAT
\\c 1

\\p
\\v 1 This is a test.
\\p
\\v 2 This is a test.`;
    const document = new UsfmDocument('uri', 1, usfm, stylesheet);

    document.update(
      [
        {
          range: { start: { line: 4, character: 13 }, end: { line: 6, character: 13 } },
          text: 'verse one.\n\\p\n\\v 2 This is not ',
        },
      ],
      2,
    );

    expect(document.children.length).toEqual(4);

    const paragraph1 = document.children[2];
    expect(paragraph1.getText()).toEqual(`\\p\n\\v 1 This is verse one.`);
    expect(paragraph1.range).toEqual({ start: { line: 3, character: 0 }, end: { line: 4, character: 23 } });

    const paragraph2 = document.children[3];
    expect(paragraph2.getText()).toEqual(`\\p\n\\v 2 This is not a test.`);
    expect(paragraph2.range).toEqual({ start: { line: 5, character: 0 }, end: { line: 6, character: 24 } });
  });
});
