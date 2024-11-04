import { UsfmStylesheet } from '@sillsdev/machine/corpora';
import { describe, expect, it } from 'vitest';

import { UsfmDocument } from './usfm-document';
import { UsfmScriptureSerializer } from './usfm-scripture-serializer';

describe('UsfmScriptureSerializer', () => {
  it('single paragraph', () => {
    const usfm = '\\p This is a paragraph.';
    const result = serialize(usfm);
    expect(result).toEqual(usfm);
  });

  it('multiple paragraphs', () => {
    const usfm = `\\p This is a paragraph.
\\p This is another paragraph.`;
    const result = serialize(usfm);
    expect(result).toEqual(usfm);
  });

  it('nested character style', () => {
    const usfm = '\\add an addition containing the word \\+nd Lord\\+nd*\\add*';
    const result = serialize(usfm);
    expect(result).toEqual(usfm);
  });

  it('attributes', () => {
    const usfm = '\\fig At once they left their nets.|src="avnt016.jpg" size="span" ref="1.18"\\fig*';
    const result = serialize(usfm);
    expect(result).toEqual(usfm);
  });

  it('default attribute', () => {
    const usfm = '\\w gracious|grace\\w*';
    const result = serialize(usfm);
    expect(result).toEqual(usfm);
  });

  it('chapter and verse', () => {
    const usfm = `\\c 1
\\p
\\v 1 This is a verse.`;
    const result = serialize(usfm);
    expect(result).toEqual(usfm);
  });

  it('table', () => {
    const usfm = `\\tr \\th1 Tribe \\th2 Leader \\thr3 Number
\\tr \\tc1 Reuben \\tc2 Elizur son of Shedeur \\tcr3 46,500
\\tr \\tc1 Simeon \\tc2 Shelumiel son of Zurishaddai \\tcr3 59,300
\\tr \\tc1 Gad \\tc2 Eliasaph son of Deuel \\tcr3 45,650
\\tr \\tcr1-2 Total: \\tcr3 151,450`;
    const result = serialize(usfm);
    expect(result).toEqual(usfm);
  });
});

function serialize(usfm: string): string {
  const stylesheet = new UsfmStylesheet('usfm.sty');
  const document = new UsfmDocument('uri', 1, usfm, stylesheet);
  const serializer = new UsfmScriptureSerializer(stylesheet);

  return normalize(serializer.serialize(document));
}

function normalize(text: string): string {
  return text.replace(/\r?\n/g, '\n').trim();
}
