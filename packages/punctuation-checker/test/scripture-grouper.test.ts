import { ScriptureDocument, ScriptureNode, ScriptureText } from '@sillsdev/lynx';
import { UsfmDocumentFactory } from '@sillsdev/lynx-usfm';
import { UsfmStylesheet } from '@sillsdev/machine/corpora';
import { expect, it } from 'vitest';

import { CheckableGroup } from '../src/checkable';
import { ScriptureTextNodeGrouper } from '../src/scripture-grouper';

it('provides a single checkable from a document with only one (non-verse) text node', () => {
  const testEnv = new TestEnvironment();
  const document: ScriptureDocument = testEnv.createScriptureDocument('\\toc1 name for table of contents');
  const grouper: ScriptureTextNodeGrouper = new ScriptureTextNodeGrouper(document);
  const groups: Generator<CheckableGroup> = grouper.getCheckableGroups();

  const onlyGroup: CheckableGroup = groups.next().value;
  expect(onlyGroup.size()).toEqual(1);
  expect(onlyGroup.next().value.getText()).toEqual('name for table of contents');
  expect(onlyGroup.next().done).toBe(true);
  expect(groups.next().done).toBe(true);
});

it('provides a single checkable from a document with only one (verse) text node', () => {
  const testEnv = new TestEnvironment();
  const document: ScriptureDocument = testEnv.createScriptureDocument('\\c 1 \\v 1 this is verse text');
  const grouper: ScriptureTextNodeGrouper = new ScriptureTextNodeGrouper(document);
  const groups: Generator<CheckableGroup> = grouper.getCheckableGroups();

  const onlyGroup: CheckableGroup = groups.next().value;
  expect(onlyGroup.size()).toEqual(1);
  expect(onlyGroup.next().value.getText()).toEqual('this is verse text');
  expect(onlyGroup.next().done).toBe(true);
  expect(groups.next().done).toBe(true);
});

it('provides a single checkable from a document with only one (note) text node', () => {
  const testEnv = new TestEnvironment();
  const document: ScriptureDocument = testEnv.createScriptureDocument('\\f + some footnote text\\f*');
  const grouper: ScriptureTextNodeGrouper = new ScriptureTextNodeGrouper(document);
  const groups: Generator<CheckableGroup> = grouper.getCheckableGroups();

  const onlyGroup: CheckableGroup = groups.next().value;
  expect(onlyGroup.size()).toEqual(1);
  expect(onlyGroup.next().value.getText()).toEqual('some footnote text');
  expect(onlyGroup.next().done).toBe(true);
  expect(groups.next().done).toBe(true);
});

it('provides multiple checkables from a document only containing multiple standalone text nodes', () => {
  const testEnv = new TestEnvironment();
  const document: ScriptureDocument = testEnv.createScriptureDocument(
    '\\toc1 name for table of contents \\is introduction \\ip some introduction text',
  );
  const grouper: ScriptureTextNodeGrouper = new ScriptureTextNodeGrouper(document);
  const groups: Generator<CheckableGroup> = grouper.getCheckableGroups();

  const firstGroup: CheckableGroup = groups.next().value;
  expect(firstGroup.size()).toEqual(1);
  expect(firstGroup.next().value.getText()).toEqual('name for table of contents');
  expect(firstGroup.next().done).toBe(true);
  const secondGroup: CheckableGroup = groups.next().value;
  expect(secondGroup.size()).toEqual(1);
  expect(secondGroup.next().value.getText()).toEqual('introduction');
  expect(secondGroup.next().done).toBe(true);
  const thirdGroup: CheckableGroup = groups.next().value;
  expect(thirdGroup.size()).toEqual(1);
  expect(thirdGroup.next().value.getText()).toEqual('some introduction text');
  expect(thirdGroup.next().done).toBe(true);
  expect(groups.next().done).toBe(true);
});

it('groups multiple verse text nodes together from a document with only verse text nodes', () => {
  const testEnv = new TestEnvironment();
  const document: ScriptureDocument = testEnv.createScriptureDocument(
    '\\c 1 \\v 1 text for first verse \\v 2 and second verse text \\v 3 with last verse text',
  );
  const grouper: ScriptureTextNodeGrouper = new ScriptureTextNodeGrouper(document);
  const groups: Generator<CheckableGroup> = grouper.getCheckableGroups();

  const onlyGroup: CheckableGroup = groups.next().value;
  expect(onlyGroup.size()).toEqual(3);
  expect(onlyGroup.next().value.getText()).toEqual('text for first verse ');
  expect(onlyGroup.next().value.getText()).toEqual('and second verse text ');
  expect(onlyGroup.next().value.getText()).toEqual('with last verse text');
  expect(onlyGroup.next().done).toBe(true);
  expect(groups.next().done).toBe(true);
});

it('groups multiple text nodes from the same note together in a document with nothing else', () => {
  const testEnv = new TestEnvironment();
  const document: ScriptureDocument = testEnv.createScriptureDocument(
    '\\f + \\fr 1.1: \\ft Some manuscripts do not have \\fq the Son of God.\\f*',
  );
  const grouper: ScriptureTextNodeGrouper = new ScriptureTextNodeGrouper(document);
  const groups: Generator<CheckableGroup> = grouper.getCheckableGroups();

  const onlyGroup: CheckableGroup = groups.next().value;
  expect(onlyGroup.size()).toEqual(3);
  expect(onlyGroup.next().value.getText()).toEqual('1.1: ');
  expect(onlyGroup.next().value.getText()).toEqual('Some manuscripts do not have ');
  expect(onlyGroup.next().value.getText()).toEqual('the Son of God.');
  expect(onlyGroup.next().done).toBe(true);
  expect(groups.next().done).toBe(true);
});

it("doesn't group nodes before the first verse, but groups nodes after that into verse nodes", () => {
  const testEnv = new TestEnvironment();
  const document: ScriptureDocument = testEnv.createScriptureDocument(
    '\\toc1 name for table of contents \\is introduction \\ip some introduction text \\c 1 \\v 1 first verse text \\v 2 second verse text',
  );
  const grouper: ScriptureTextNodeGrouper = new ScriptureTextNodeGrouper(document);
  const groups: Generator<CheckableGroup> = grouper.getCheckableGroups();

  const firstStandaloneGroup: CheckableGroup = groups.next().value;
  expect(firstStandaloneGroup.size()).toEqual(1);
  expect(firstStandaloneGroup.next().value.getText()).toEqual('name for table of contents');
  expect(firstStandaloneGroup.next().done).toBe(true);

  const secondStandaloneGroup: CheckableGroup = groups.next().value;
  expect(secondStandaloneGroup.size()).toEqual(1);
  expect(secondStandaloneGroup.next().value.getText()).toEqual('introduction');
  expect(secondStandaloneGroup.next().done).toBe(true);

  const thirdStandaloneGroup: CheckableGroup = groups.next().value;
  expect(thirdStandaloneGroup.size()).toEqual(1);
  expect(thirdStandaloneGroup.next().value.getText()).toEqual('some introduction text');
  expect(thirdStandaloneGroup.next().done).toBe(true);

  const verseNodeGroup: CheckableGroup = groups.next().value;
  expect(verseNodeGroup.size()).toEqual(2);
  expect(verseNodeGroup.next().value.getText()).toEqual('first verse text ');
  expect(verseNodeGroup.next().value.getText()).toEqual('second verse text');
  expect(verseNodeGroup.next().done).toBe(true);
  expect(groups.next().done).toBe(true);
});

it('groups multiple text nodes from a note that occurs before the start of verse text', () => {
  const testEnv = new TestEnvironment();
  const document: ScriptureDocument = testEnv.createScriptureDocument(
    '\\is introduction \\ip some introduction\\f + \\fr 1.1 \\ft and a \\fq footnote\\f* text \\c 1 \\v 1 first verse text \\v 2 second verse text',
  );
  const grouper: ScriptureTextNodeGrouper = new ScriptureTextNodeGrouper(document);
  const groups: Generator<CheckableGroup> = grouper.getCheckableGroups();

  const firstStandaloneGroup: CheckableGroup = groups.next().value;
  expect(firstStandaloneGroup.size()).toEqual(1);
  expect(firstStandaloneGroup.next().value.getText()).toEqual('introduction');
  expect(firstStandaloneGroup.next().done).toBe(true);

  const secondStandaloneGroup: CheckableGroup = groups.next().value;
  expect(secondStandaloneGroup.size()).toEqual(1);
  expect(secondStandaloneGroup.next().value.getText()).toEqual('some introduction');
  expect(secondStandaloneGroup.next().done).toBe(true);

  const thirdStandaloneGroup: CheckableGroup = groups.next().value;
  expect(thirdStandaloneGroup.size()).toEqual(1);
  expect(thirdStandaloneGroup.next().value.getText()).toEqual(' text');
  expect(thirdStandaloneGroup.next().done).toBe(true);

  const verseNodeGroup: CheckableGroup = groups.next().value;
  expect(verseNodeGroup.size()).toEqual(2);
  expect(verseNodeGroup.next().value.getText()).toEqual('first verse text ');
  expect(verseNodeGroup.next().value.getText()).toEqual('second verse text');
  expect(verseNodeGroup.next().done).toBe(true);

  const footnoteGroup: CheckableGroup = groups.next().value;
  expect(footnoteGroup.size()).toEqual(3);
  expect(footnoteGroup.next().value.getText()).toEqual('1.1 ');
  expect(footnoteGroup.next().value.getText()).toEqual('and a ');
  expect(footnoteGroup.next().value.getText()).toEqual('footnote');
  expect(footnoteGroup.next().done).toBe(true);
  expect(groups.next().done).toBe(true);
});

class TestEnvironment {
  private readonly scriptureDocumentFactory: UsfmDocumentFactory;

  constructor() {
    const stylesheet: UsfmStylesheet = new UsfmStylesheet('usfm.sty');
    this.scriptureDocumentFactory = new UsfmDocumentFactory(stylesheet);
  }

  createScriptureNode(
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

  createScriptureDocument(usfm: string): ScriptureDocument {
    return this.scriptureDocumentFactory.create('test-uri', { format: 'usfm', version: 1, content: usfm });
  }
}
