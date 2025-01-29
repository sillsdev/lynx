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

  describe('it returns true/false for possible whitespace truncation based on the presence of a neighboring paragraph marker', () => {
    const stylesheet: UsfmStylesheet = new UsfmStylesheet('usfm.sty');
    const scriptureDocumentFactory: DocumentFactory<ScriptureDocument> = new UsfmDocumentFactory(stylesheet);

    it('works for a single verse node with no paragraphs', () => {
      const noParagraphMarkerDoc: ScriptureDocument = scriptureDocumentFactory.create(
        'test',
        'usfm',
        1,
        `\\c 1
       \\v 1 In the beginning`,
      );
      const onlyScriptureNode: ScriptureNodeCheckable = new ScriptureTextNodeGrouper(noParagraphMarkerDoc)
        .getCheckableGroups()
        .next()
        .value.next().value;
      expect(onlyScriptureNode.isLeadingWhitespacePossiblyTruncated()).toBe(false);
      expect(onlyScriptureNode.isTrailingWhitespacePossiblyTruncated()).toBe(false);
    });

    it('works for verse text surrounded by paragraphs on both sides', () => {
      const multipleParagraphsDoc: ScriptureDocument = scriptureDocumentFactory.create(
        'test',
        'usfm',
        1,
        `\\c 1
       \\v 1 \\q1 The Word Became Flesh \\p`,
      );
      const onlyScriptureNode: ScriptureNodeCheckable = new ScriptureTextNodeGrouper(multipleParagraphsDoc)
        .getCheckableGroups()
        .next()
        .value.next().value;
      expect(onlyScriptureNode.isLeadingWhitespacePossiblyTruncated()).toBe(true);
      expect(onlyScriptureNode.isTrailingWhitespacePossiblyTruncated()).toBe(true);
    });

    it("works for nodes that are near, but don't border paragraphs", () => {
      const multipleParagraphsDoc: ScriptureDocument = scriptureDocumentFactory.create(
        'test',
        'usfm',
        1,
        `\\c 1
         \\p \\v 1 The Word Became Flesh \\v 2 \\p`,
      );
      const onlyScriptureNode: ScriptureNodeCheckable = new ScriptureTextNodeGrouper(multipleParagraphsDoc)
        .getCheckableGroups()
        .next()
        .value.next().value;
      expect(onlyScriptureNode.isLeadingWhitespacePossiblyTruncated()).toBe(false);
      expect(onlyScriptureNode.isTrailingWhitespacePossiblyTruncated()).toBe(false);
    });

    it('works for multiple verse text nodes, only some of which border paragraphs', () => {
      const multipleParagraphsDoc: ScriptureDocument = scriptureDocumentFactory.create(
        'test',
        'usfm',
        1,
        `\\c 1
       \\v 1 \\q1 The Word \\qs Became Flesh\\qs* \\p`,
      );
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
