import { DocumentFactory, ScriptureDocument, ScriptureNode, ScriptureText } from '@sillsdev/lynx';
import { UsfmDocumentFactory } from '@sillsdev/lynx-usfm';
import { UsfmStylesheet } from '@sillsdev/machine/corpora';
import { describe, expect, it } from 'vitest';

import { CheckableGroup, ScriptureNodeCheckable, TextDocumentCheckable } from '../src/checkable';
import { ScriptureTextNodeGrouper } from '../src/scripture-grouper';

describe('TextDocumentCheckable tests', () => {
  it('returns the text that is passed to it', () => {
    expect(new TextDocumentCheckable('test text').getText()).toEqual('test text');
  });

  it('returns undefined for its enclosing range', () => {
    expect(new TextDocumentCheckable('test text').getEnclosingRange()).toBeUndefined();
  });

  it('returns false for its whitespace being possible truncated', () => {
    expect(new TextDocumentCheckable('test text').isLeadingWhitespacePossiblyTruncated()).toBe(false);
    expect(new TextDocumentCheckable('test text').isTrailingWhitespacePossiblyTruncated()).toBe(false);
  });

  it('always returns true for having a paragraph start', () => {
    expect(new TextDocumentCheckable('').hasParagraphStart()).toBe(true);
    expect(new TextDocumentCheckable('\n').hasParagraphStart()).toBe(true);
    expect(new TextDocumentCheckable('test text').hasParagraphStart()).toBe(true);
    expect(new TextDocumentCheckable('test text\n').hasParagraphStart()).toBe(true);
    expect(new TextDocumentCheckable('test\n text').hasParagraphStart()).toBe(true);
  });

  it('correctly returns the text between the last paragraph start and the provided offset', () => {
    expect(new TextDocumentCheckable('').getTextSinceLastParagraphStart(0)).toEqual('');
    expect(new TextDocumentCheckable('').getTextSinceLastParagraphStart(5)).toEqual('');

    expect(new TextDocumentCheckable('test').getTextSinceLastParagraphStart(4)).toEqual('test');
    expect(new TextDocumentCheckable('test').getTextSinceLastParagraphStart(3)).toEqual('tes');
    expect(new TextDocumentCheckable('test').getTextSinceLastParagraphStart(8)).toEqual('test');
    expect(new TextDocumentCheckable('  test').getTextSinceLastParagraphStart(4)).toEqual('  te');

    expect(new TextDocumentCheckable('test\ntext').getTextSinceLastParagraphStart(8)).toEqual('tex');
    expect(new TextDocumentCheckable('test\ntext').getTextSinceLastParagraphStart(9)).toEqual('text');
    expect(new TextDocumentCheckable('test\ntext').getTextSinceLastParagraphStart(4)).toEqual('test');
    expect(new TextDocumentCheckable('test\ntext').getTextSinceLastParagraphStart(5)).toEqual('');
    expect(new TextDocumentCheckable('test\n  text').getTextSinceLastParagraphStart(10)).toEqual('  tex');

    expect(new TextDocumentCheckable('more\n  test\ntext').getTextSinceLastParagraphStart(8)).toEqual('  t');
    expect(new TextDocumentCheckable('more\n  test\ntext').getTextSinceLastParagraphStart(15)).toEqual('tex');
  });
});

describe('ScriptureDocumentCheckable tests', () => {
  it('returns the text of the Scripture Node passed to it', () => {
    const scriptureNode: ScriptureNode = createScriptureNode('scripture text', 0, 3, 1, 4);

    expect(new ScriptureNodeCheckable(scriptureNode).getText()).toEqual(scriptureNode.getText());
  });

  it("returns the ScriptureNode's range as its enclosing range", () => {
    const scriptureNode: ScriptureNode = createScriptureNode('scripture text', 0, 3, 1, 4);

    expect(new ScriptureNodeCheckable(scriptureNode).getEnclosingRange()).toEqual(scriptureNode.range);
  });

  describe('it returns true/false for possible whitespace truncation based on the presence of neighboring USFM markers', () => {
    const stylesheet: UsfmStylesheet = new UsfmStylesheet('usfm.sty');
    const scriptureDocumentFactory: DocumentFactory<ScriptureDocument> = new UsfmDocumentFactory(stylesheet);

    it('works for a single verse node with no paragraphs', () => {
      const noParagraphMarkerDoc: ScriptureDocument = scriptureDocumentFactory.create('test', {
        format: 'usfm',
        version: 1,
        content: `\\c 1
       \\v 1 In the beginning`,
      });
      const onlyScriptureNode: ScriptureNodeCheckable = new ScriptureTextNodeGrouper(noParagraphMarkerDoc)
        .getCheckableGroups()
        .next()
        .value.next().value;
      expect(onlyScriptureNode.isLeadingWhitespacePossiblyTruncated()).toBe(true);
      expect(onlyScriptureNode.isTrailingWhitespacePossiblyTruncated()).toBe(false);
    });

    it('works for verse text surrounded by paragraphs on both sides', () => {
      const multipleParagraphsDoc: ScriptureDocument = scriptureDocumentFactory.create('test', {
        format: 'usfm',
        version: 1,
        content: `\\c 1
       \\v 1 \\q1 The Word Became Flesh \\p`,
      });
      const onlyScriptureNode: ScriptureNodeCheckable = new ScriptureTextNodeGrouper(multipleParagraphsDoc)
        .getCheckableGroups()
        .next()
        .value.next().value;
      expect(onlyScriptureNode.isLeadingWhitespacePossiblyTruncated()).toBe(true);
      expect(onlyScriptureNode.isTrailingWhitespacePossiblyTruncated()).toBe(true);
    });

    it("works for nodes that are near, but don't border paragraphs", () => {
      const multipleParagraphsDoc: ScriptureDocument = scriptureDocumentFactory.create('test', {
        format: 'usfm',
        version: 1,
        content: `\\c 1
         \\p \\v 1 \\p \\k \\k* The Word Became Flesh \\k \\k* \\v 2 \\p`,
      });
      const onlyScriptureNode: ScriptureNodeCheckable = new ScriptureTextNodeGrouper(multipleParagraphsDoc)
        .getCheckableGroups()
        .next()
        .value.next().value;
      expect(onlyScriptureNode.isLeadingWhitespacePossiblyTruncated()).toBe(false);
      expect(onlyScriptureNode.isTrailingWhitespacePossiblyTruncated()).toBe(false);
    });

    it('works for multiple verse text nodes, only some of which border paragraphs', () => {
      const multipleParagraphsDoc: ScriptureDocument = scriptureDocumentFactory.create('test', {
        format: 'usfm',
        version: 1,
        content: `\\c 1
       \\v 1 \\q1 The Word \\qs Became Flesh\\qs* \\p`,
      });
      const verseNodeGroup: CheckableGroup = new ScriptureTextNodeGrouper(multipleParagraphsDoc)
        .getCheckableGroups()
        .next().value;
      const firstScriptureNode: ScriptureNodeCheckable = verseNodeGroup.next().value;
      expect(firstScriptureNode.isLeadingWhitespacePossiblyTruncated()).toBe(true);
      expect(firstScriptureNode.isTrailingWhitespacePossiblyTruncated()).toBe(false);

      const secondScriptureNode: ScriptureNodeCheckable = verseNodeGroup.next().value;
      expect(secondScriptureNode.isLeadingWhitespacePossiblyTruncated()).toBe(false);
      expect(secondScriptureNode.isTrailingWhitespacePossiblyTruncated()).toBe(false);

      const thirdScriptureNode: ScriptureNodeCheckable = verseNodeGroup.next().value;
      expect(thirdScriptureNode.isLeadingWhitespacePossiblyTruncated()).toBe(false);
      expect(thirdScriptureNode.isTrailingWhitespacePossiblyTruncated()).toBe(true);
    });

    it('works for verse text nodes that are bordered by verse and chapter markers', () => {
      const multipleParagraphsDoc: ScriptureDocument = scriptureDocumentFactory.create('test', {
        format: 'usfm',
        version: 1,
        content: `\\c 1
       \\v 1 The Word Became Flesh \\v 2 and dwelt \\k among\\k* us \\c 2`,
      });

      const verseNodeGroup: CheckableGroup = new ScriptureTextNodeGrouper(multipleParagraphsDoc)
        .getCheckableGroups()
        .next().value;

      const firstScriptureNode: ScriptureNodeCheckable = verseNodeGroup.next().value;
      expect(firstScriptureNode.isLeadingWhitespacePossiblyTruncated()).toBe(true);
      expect(firstScriptureNode.isTrailingWhitespacePossiblyTruncated()).toBe(true);

      const secondScriptureNode: ScriptureNodeCheckable = verseNodeGroup.next().value;
      expect(secondScriptureNode.isLeadingWhitespacePossiblyTruncated()).toBe(true);
      expect(secondScriptureNode.isTrailingWhitespacePossiblyTruncated()).toBe(false);

      const thirdScriptureNode: ScriptureNodeCheckable = verseNodeGroup.next().value;
      expect(thirdScriptureNode.isLeadingWhitespacePossiblyTruncated()).toBe(false);
      expect(thirdScriptureNode.isTrailingWhitespacePossiblyTruncated()).toBe(false);

      const fourthScriptureNode: ScriptureNodeCheckable = verseNodeGroup.next().value;
      expect(fourthScriptureNode.isLeadingWhitespacePossiblyTruncated()).toBe(false);
      expect(fourthScriptureNode.isTrailingWhitespacePossiblyTruncated()).toBe(true);
    });
  });

  describe('it returns true/false for having a paragraph start based on the presence of a preceding paragraph marker', () => {
    const stylesheet: UsfmStylesheet = new UsfmStylesheet('usfm.sty');
    const scriptureDocumentFactory: DocumentFactory<ScriptureDocument> = new UsfmDocumentFactory(stylesheet);

    it('works for a single verse node with no paragraphs', () => {
      const noParagraphMarkerDoc: ScriptureDocument = scriptureDocumentFactory.create('test', {
        format: 'usfm',
        version: 1,
        content: `\\c 1
       \\v 1 In the beginning`,
      });
      const onlyScriptureNode: ScriptureNodeCheckable = new ScriptureTextNodeGrouper(noParagraphMarkerDoc)
        .getCheckableGroups()
        .next()
        .value.next().value;
      expect(onlyScriptureNode.hasParagraphStart()).toBe(false);
    });

    it('works for verse text surrounded by paragraphs on both sides', () => {
      const multipleParagraphsDoc: ScriptureDocument = scriptureDocumentFactory.create('test', {
        format: 'usfm',
        version: 1,
        content: `\\c 1
       \\v 1 \\q1 The Word Became Flesh \\p`,
      });
      const onlyScriptureNode: ScriptureNodeCheckable = new ScriptureTextNodeGrouper(multipleParagraphsDoc)
        .getCheckableGroups()
        .next()
        .value.next().value;
      expect(onlyScriptureNode.hasParagraphStart()).toBe(true);
    });

    it("works for nodes that are near, but don't border paragraphs", () => {
      const multipleParagraphsDoc: ScriptureDocument = scriptureDocumentFactory.create('test', {
        format: 'usfm',
        version: 1,
        content: `\\c 1
         \\p \\v 1 The Word Became Flesh \\v 2 \\p`,
      });
      const onlyScriptureNode: ScriptureNodeCheckable = new ScriptureTextNodeGrouper(multipleParagraphsDoc)
        .getCheckableGroups()
        .next()
        .value.next().value;
      expect(onlyScriptureNode.hasParagraphStart()).toBe(true);
    });

    it('works for multiple verse text nodes, only some of which border paragraphs', () => {
      const multipleParagraphsDoc: ScriptureDocument = scriptureDocumentFactory.create('test', {
        format: 'usfm',
        version: 1,
        content: `\\c 1
       \\v 1 \\q1 \\wj The Word \\wj* \\wj Became Flesh\\wj* \\p and dwelt`,
      });
      const verseNodeGroup: CheckableGroup = new ScriptureTextNodeGrouper(multipleParagraphsDoc)
        .getCheckableGroups()
        .next().value;
      const firstScriptureNode: ScriptureNodeCheckable = verseNodeGroup.next().value;
      expect(firstScriptureNode.hasParagraphStart()).toBe(true);

      const secondScriptureNode: ScriptureNodeCheckable = verseNodeGroup.next().value;
      expect(secondScriptureNode.hasParagraphStart()).toBe(false);

      const thirdScriptureNode: ScriptureNodeCheckable = verseNodeGroup.next().value;
      expect(thirdScriptureNode.hasParagraphStart()).toBe(false);

      const fourthScriptureNode: ScriptureNodeCheckable = verseNodeGroup.next().value;
      expect(fourthScriptureNode.hasParagraphStart()).toBe(false);

      const fifthScriptureNode: ScriptureNodeCheckable = verseNodeGroup.next().value;
      expect(fifthScriptureNode.hasParagraphStart()).toBe(true);

      // edge case
      const edgeCaseDoc: ScriptureDocument = scriptureDocumentFactory.create('test', {
        format: 'usfm',
        version: 1,
        content: `\\c 1
       \\v 1 \\q1 \\qs \\wj The Word\\wj* became flesh\\qs*`,
      });
      const edgeCaseVerseNodeGroup: CheckableGroup = new ScriptureTextNodeGrouper(edgeCaseDoc)
        .getCheckableGroups()
        .next().value;
      const firstEdgeCaseScriptureNode: ScriptureNodeCheckable = edgeCaseVerseNodeGroup.next().value;
      expect(firstEdgeCaseScriptureNode.hasParagraphStart()).toBe(true);

      const secondEdgeCaseScriptureNode: ScriptureNodeCheckable = edgeCaseVerseNodeGroup.next().value;
      expect(secondEdgeCaseScriptureNode.hasParagraphStart()).toBe(false);

      // edge case
      const edgeCaseDoc2: ScriptureDocument = scriptureDocumentFactory.create('test', {
        format: 'usfm',
        version: 1,
        content: `\\c 1
       \\v 1 \\q1 \\wj The \\pn Word\\pn*\\wj* \\wj became \\pn flesh\\pn*\\wj*`,
      });
      const edgeCaseVerseNodeGroup2: CheckableGroup = new ScriptureTextNodeGrouper(edgeCaseDoc2)
        .getCheckableGroups()
        .next().value;
      const firstEdgeCaseScriptureNode2: ScriptureNodeCheckable = edgeCaseVerseNodeGroup2.next().value;
      expect(firstEdgeCaseScriptureNode2.hasParagraphStart()).toBe(true);

      const secondEdgeCaseScriptureNode2: ScriptureNodeCheckable = edgeCaseVerseNodeGroup2.next().value;
      expect(secondEdgeCaseScriptureNode2.hasParagraphStart()).toBe(false);

      const thirdEdgeCaseScriptureNode2: ScriptureNodeCheckable = edgeCaseVerseNodeGroup2.next().value;
      expect(thirdEdgeCaseScriptureNode2.hasParagraphStart()).toBe(false);

      const fourthEdgeCaseScriptureNode2: ScriptureNodeCheckable = edgeCaseVerseNodeGroup2.next().value;
      expect(fourthEdgeCaseScriptureNode2.hasParagraphStart()).toBe(false);

      const fifthEdgeCaseScriptureNode2: ScriptureNodeCheckable = edgeCaseVerseNodeGroup2.next().value;
      expect(fifthEdgeCaseScriptureNode2.hasParagraphStart()).toBe(false);
    });

    it('ignores the presence of certain types of nodes', () => {
      const scriptureDoc: ScriptureDocument = scriptureDocumentFactory.create('test', {
        format: 'usfm',
        version: 1,
        content: `\\c 1
       \\v 1 \\q1 \\x + \\xo 5:5 \\xta Cited \\xt John 3:16\\x* The Word became flesh`,
      });
      const verseNodeGroup: CheckableGroup = new ScriptureTextNodeGrouper(scriptureDoc)
        .getCheckableGroups()
        .next().value;
      const firstScriptureNode: ScriptureNodeCheckable = verseNodeGroup.next().value;
      expect(firstScriptureNode.hasParagraphStart()).toBe(true);

      const scriptureDoc2: ScriptureDocument = scriptureDocumentFactory.create('test', {
        format: 'usfm',
        version: 1,
        content: `\\c 1
       \\v 1 \\q1 \\f + \\fr 5:11 \\ft Or \\fqa a flesh\\f* The Word became flesh`,
      });
      const verseNodeGroup2: CheckableGroup = new ScriptureTextNodeGrouper(scriptureDoc2)
        .getCheckableGroups()
        .next().value;
      const firstScriptureNode2: ScriptureNodeCheckable = verseNodeGroup2.next().value;
      expect(firstScriptureNode2.hasParagraphStart()).toBe(true);
    });
  });

  describe('it returns the text since the last paragraph start correctly', () => {
    const stylesheet: UsfmStylesheet = new UsfmStylesheet('usfm.sty');
    const scriptureDocumentFactory: DocumentFactory<ScriptureDocument> = new UsfmDocumentFactory(stylesheet);

    it('returns undefined if there is not a preceding paragraph or chapter marker', () => {
      const docWithParagraphMarker: ScriptureDocument = scriptureDocumentFactory.create('test', {
        format: 'usfm',
        version: 1,
        content: `\\c 1
       \\v 1 \\p In the beginning \\qs This is in a style marker \\qs*`,
      });
      const scriptureNodeGroup: CheckableGroup = new ScriptureTextNodeGrouper(docWithParagraphMarker)
        .getCheckableGroups()
        .next().value;

      const _nodeWithPrecedingParagraphMarker: ScriptureNodeCheckable = scriptureNodeGroup.next().value;
      const nodeWithoutPrecedingParagraphMarker: ScriptureNodeCheckable = scriptureNodeGroup.next().value;
      expect(nodeWithoutPrecedingParagraphMarker.getTextSinceLastParagraphStart(0)).toBeUndefined();
      expect(nodeWithoutPrecedingParagraphMarker.getTextSinceLastParagraphStart(5)).toBeUndefined();
    });

    it('returns the correct text based on the provided offset', () => {
      const docWithParagraphMarker1: ScriptureDocument = scriptureDocumentFactory.create('test', {
        format: 'usfm',
        version: 1,
        content: `\\c 1
        \\v 1 \\p In the beginning`,
      });
      const scriptureNode1: ScriptureNodeCheckable = new ScriptureTextNodeGrouper(docWithParagraphMarker1)
        .getCheckableGroups()
        .next()
        .value.next().value;
      expect(scriptureNode1.getTextSinceLastParagraphStart(0)).toEqual('');
      expect(scriptureNode1.getTextSinceLastParagraphStart(5)).toEqual('In th');
      expect(scriptureNode1.getTextSinceLastParagraphStart(15)).toEqual('In the beginnin');
      expect(scriptureNode1.getTextSinceLastParagraphStart(16)).toEqual('In the beginning');
      expect(scriptureNode1.getTextSinceLastParagraphStart(21)).toEqual('In the beginning');

      const docWithParagraphMarker2: ScriptureDocument = scriptureDocumentFactory.create('test', {
        format: 'usfm',
        version: 1,
        content: `\\c 1
        \\v 1 In the beginning \\p was the Word`,
      });
      const checkableGroup2: CheckableGroup = new ScriptureTextNodeGrouper(docWithParagraphMarker2)
        .getCheckableGroups()
        .next().value;
      const _scriptureNode2a: ScriptureNodeCheckable = checkableGroup2.next().value;
      const scriptureNode2b: ScriptureNodeCheckable = checkableGroup2.next().value;
      expect(scriptureNode2b.getTextSinceLastParagraphStart(0)).toEqual('');
      expect(scriptureNode2b.getTextSinceLastParagraphStart(5)).toEqual('was t');
      expect(scriptureNode2b.getTextSinceLastParagraphStart(10)).toEqual('was the Wo');
      expect(scriptureNode2b.getTextSinceLastParagraphStart(13)).toEqual('was the Word');
      expect(scriptureNode2b.getTextSinceLastParagraphStart(15)).toEqual('was the Word');

      const docWithParagraphMarker3: ScriptureDocument = scriptureDocumentFactory.create('test', {
        format: 'usfm',
        version: 1,
        content: `\\c 1
        \\p
        \\v 1 In the beginning
        \\p
        was the Word`,
      });
      const checkableGroup3: CheckableGroup = new ScriptureTextNodeGrouper(docWithParagraphMarker3)
        .getCheckableGroups()
        .next().value;
      const scriptureNode3a: ScriptureNodeCheckable = checkableGroup3.next().value;
      const scriptureNode3b: ScriptureNodeCheckable = checkableGroup3.next().value;
      expect(scriptureNode3a.getTextSinceLastParagraphStart(0)).toEqual('');
      expect(scriptureNode3a.getTextSinceLastParagraphStart(5)).toEqual('In th');
      expect(scriptureNode3a.getTextSinceLastParagraphStart(15)).toEqual('In the beginnin');
      expect(scriptureNode3a.getTextSinceLastParagraphStart(16)).toEqual('In the beginning');
      expect(scriptureNode3a.getTextSinceLastParagraphStart(21)).toEqual('In the beginning');
      expect(scriptureNode3b.getTextSinceLastParagraphStart(0)).toEqual('');
      expect(scriptureNode3b.getTextSinceLastParagraphStart(5)).toEqual('was t');
      expect(scriptureNode3b.getTextSinceLastParagraphStart(10)).toEqual('was the Wo');
      expect(scriptureNode3b.getTextSinceLastParagraphStart(13)).toEqual('was the Word');
      expect(scriptureNode3b.getTextSinceLastParagraphStart(15)).toEqual('was the Word');
    });
  });
});

function createScriptureNode(
  text: string,
  lineStart: number,
  characterStart: number,
  lineEnd: number,
  characterEnd: number,
): ScriptureNode {
  return new ScriptureText(text, {
    start: {
      line: lineStart,
      character: characterStart,
    },
    end: {
      line: lineEnd,
      character: characterEnd,
    },
  });
}
