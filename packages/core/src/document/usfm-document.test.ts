import { UsfmStylesheet } from '@sillsdev/machine/corpora';
import { describe, expect, it } from 'vitest';

import { ScriptureBook } from './scripture-book';
import { ScriptureParagraph } from './scripture-paragraph';
import { UsfmDocument } from './usfm-document';

describe('UsfmDocument', () => {
  it('should parse usfm document', () => {
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
    const book = document.children[0] as ScriptureBook;
    expect(book).toBeInstanceOf(ScriptureBook);
    expect(book.code).toEqual('MAT');
    expect(book.range).toEqual({ start: { line: 0, character: 0 }, end: { line: 0, character: 7 } });

    const paragraph1 = document.children[2] as ScriptureParagraph;
    expect(paragraph1).toBeInstanceOf(ScriptureParagraph);
    expect(paragraph1.style).toEqual('p');
    expect(paragraph1.range).toEqual({ start: { line: 3, character: 0 }, end: { line: 4, character: 20 } });

    const paragraph2 = document.children[3] as ScriptureParagraph;
    expect(paragraph2).toBeInstanceOf(ScriptureParagraph);
    expect(paragraph2.style).toEqual('p');
    expect(paragraph2.range).toEqual({ start: { line: 5, character: 0 }, end: { line: 6, character: 20 } });
  });
});
