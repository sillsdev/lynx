import { describe, expect, it } from 'vitest';

import { ScriptureChapter } from './scripture-chapter';
import { ScriptureContainer } from './scripture-container';
import { ScriptureDocument, ScriptureNode, ScriptureNodeType } from './scripture-document';

describe('ScriptureDocument', () => {
  it('appendChild', () => {
    const doc = new TestScriptureDocument('uri', 'format', 1);

    doc.appendChild(new ScriptureChapter('1'));

    expect(doc.children).toHaveLength(1);
    let chapter1 = doc.children[0] as ScriptureChapter;
    expect(chapter1.number).toBe('1');
    expect(chapter1.next).toBeUndefined();
    expect(chapter1.previous).toBeUndefined();

    doc.appendChild(new ScriptureChapter('2'));

    expect(doc.children).toHaveLength(2);
    chapter1 = doc.children[0] as ScriptureChapter;
    const chapter2 = doc.children[1] as ScriptureChapter;
    expect(chapter1.number).toBe('1');
    expect(chapter1.next).toBe(chapter2);
    expect(chapter1.previous).toBeUndefined();
    expect(chapter2.number).toBe('2');
    expect(chapter2.next).toBeUndefined();
    expect(chapter2.previous).toBe(chapter1);
  });

  it('insertChild', () => {
    const doc = new TestScriptureDocument('uri', 'format', 1);

    doc.insertChild(0, new ScriptureChapter('2'));

    expect(doc.children).toHaveLength(1);
    let chapter2 = doc.children[0] as ScriptureChapter;
    expect(chapter2.number).toBe('2');
    expect(chapter2.next).toBeUndefined();
    expect(chapter2.previous).toBeUndefined();

    doc.insertChild(0, new ScriptureChapter('1'));

    expect(doc.children).toHaveLength(2);
    let chapter1 = doc.children[0] as ScriptureChapter;
    chapter2 = doc.children[1] as ScriptureChapter;
    expect(chapter1.number).toBe('1');
    expect(chapter1.next).toBe(chapter2);
    expect(chapter1.previous).toBeUndefined();
    expect(chapter2.number).toBe('2');
    expect(chapter2.next).toBeUndefined();
    expect(chapter2.previous).toBe(chapter1);

    doc.insertChild(2, new ScriptureChapter('3'));

    expect(doc.children).toHaveLength(3);
    chapter1 = doc.children[0] as ScriptureChapter;
    chapter2 = doc.children[1] as ScriptureChapter;
    const chapter3 = doc.children[2] as ScriptureChapter;
    expect(chapter2.number).toBe('2');
    expect(chapter2.next).toBe(chapter3);
    expect(chapter2.previous).toBe(chapter1);
    expect(chapter3.number).toBe('3');
    expect(chapter3.next).toBeUndefined();
    expect(chapter3.previous).toBe(chapter2);
  });

  it('spliceChildren', () => {
    const doc = new TestScriptureDocument('uri', 'format', 1);

    doc.spliceChildren(0, 0, new ScriptureChapter('1'), new ScriptureChapter('4'), new ScriptureChapter('5'));

    expect(doc.children).toHaveLength(3);
    let chapter1 = doc.children[0] as ScriptureChapter;
    const chapter4 = doc.children[1] as ScriptureChapter;
    const chapter5 = doc.children[2] as ScriptureChapter;
    expect(chapter1.number).toBe('1');
    expect(chapter1.next).toBe(chapter4);
    expect(chapter1.previous).toBeUndefined();
    expect(chapter4.number).toBe('4');
    expect(chapter4.next).toBe(chapter5);
    expect(chapter4.previous).toBe(chapter1);
    expect(chapter5.number).toBe('5');
    expect(chapter5.next).toBeUndefined();
    expect(chapter5.previous).toBe(chapter4);

    doc.spliceChildren(1, 2, new ScriptureChapter('2'), new ScriptureChapter('3'));
    expect(doc.children).toHaveLength(3);
    chapter1 = doc.children[0] as ScriptureChapter;
    const chapter2 = doc.children[1] as ScriptureChapter;
    const chapter3 = doc.children[2] as ScriptureChapter;
    expect(chapter1.number).toBe('1');
    expect(chapter1.next).toBe(chapter2);
    expect(chapter1.previous).toBeUndefined();
    expect(chapter2.number).toBe('2');
    expect(chapter2.next).toBe(chapter3);
    expect(chapter2.previous).toBe(chapter1);
    expect(chapter3.number).toBe('3');
    expect(chapter3.next).toBeUndefined();
    expect(chapter3.previous).toBe(chapter2);
  });

  it('removeChild', () => {
    const doc = new TestScriptureDocument('uri', 'format', 1, [
      new ScriptureChapter('1'),
      new ScriptureChapter('3'),
      new ScriptureChapter('2'),
    ]);

    doc.removeChild(doc.children[1]);

    expect(doc.children).toHaveLength(2);
    let chapter1 = doc.children[0] as ScriptureChapter;
    const chapter2 = doc.children[1] as ScriptureChapter;
    expect(chapter1.number).toBe('1');
    expect(chapter1.next).toBe(chapter2);
    expect(chapter1.previous).toBeUndefined();
    expect(chapter2.number).toBe('2');
    expect(chapter2.next).toBeUndefined();
    expect(chapter2.previous).toBe(chapter1);

    doc.removeChild(doc.children[1]);

    expect(doc.children).toHaveLength(1);
    chapter1 = doc.children[0] as ScriptureChapter;
    expect(chapter1.number).toBe('1');
    expect(chapter1.next).toBeUndefined();
    expect(chapter1.previous).toBeUndefined();
  });

  it('clearChildren', () => {
    const doc = new TestScriptureDocument('uri', 'format', 1, [
      new ScriptureChapter('1'),
      new ScriptureChapter('2'),
      new ScriptureChapter('3'),
    ]);

    doc.clearChildren();

    expect(doc.children).toHaveLength(0);
  });
});

class TestScriptureDocument extends ScriptureContainer implements ScriptureDocument {
  readonly uri: string;
  readonly version: number;
  readonly format: string;
  readonly type = ScriptureNodeType.Document;

  constructor(uri: string, format: string, version: number, children?: ScriptureNode[]) {
    super(children);
    this.uri = uri;
    this.format = format;
    this.version = version;
  }
}
