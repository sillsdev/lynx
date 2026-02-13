import { ScriptureChapter, ScriptureDocument, ScriptureNode, ScriptureNodeType, ScriptureVerse } from '@sillsdev/lynx';

import { CheckableGroup, ScriptureNodeCheckable } from './checkable';

export class ScriptureTextNodeGrouper {
  private standaloneNodes: ScriptureNodeCheckable[] = [];
  private nonVerseNodeGroups: ScriptureNodeCheckable[][] = [];
  private verseNodes: ScriptureNodeCheckable[] = [];
  private firstVerseNode: ScriptureNode | undefined = undefined;
  private chapter = '1';
  private verse = '0';

  private static prohibitedVerseAncestorTypes: Set<ScriptureNodeType> = new Set<ScriptureNodeType>([
    ScriptureNodeType.Note,
    ScriptureNodeType.Cell,
    ScriptureNodeType.Row,
    ScriptureNodeType.Table,
    ScriptureNodeType.Sidebar,
    ScriptureNodeType.Ref,
  ]);

  constructor(scriptureDocument: ScriptureDocument) {
    this.groupNodes(scriptureDocument);
  }

  private groupNodes(scriptureDocument: ScriptureDocument): void {
    this.processNode(scriptureDocument, undefined);
  }

  private processNode(node: ScriptureNode, currentGroup: ScriptureNode[] | undefined): void {
    if (node.type === ScriptureNodeType.Text) {
      if (currentGroup !== undefined) {
        currentGroup.push(node);
      } else if (this.firstVerseNode === undefined) {
        this.standaloneNodes.push(new ScriptureNodeCheckable(this.chapter, this.verse, node));
      } else {
        this.verseNodes.push(new ScriptureNodeCheckable(this.chapter, this.verse, node));
      }
    }

    if (node.type === ScriptureNodeType.Chapter) {
      this.chapter = (node as ScriptureChapter).number;
    }

    if (node.type === ScriptureNodeType.Verse) {
      this.verse = (node as ScriptureVerse).number;
      this.firstVerseNode ??= node;
    }

    if (ScriptureTextNodeGrouper.prohibitedVerseAncestorTypes.has(node.type)) {
      // create a new group of nodes for an embed
      const newNodeGroup: ScriptureNode[] = [];
      for (const child of node.children) {
        this.processNode(child, newNodeGroup);
      }
      if (newNodeGroup.length > 0) {
        this.nonVerseNodeGroups.push(newNodeGroup.map((x) => new ScriptureNodeCheckable(this.chapter, this.verse, x)));
      }
    } else {
      for (const child of node.children) {
        this.processNode(child, currentGroup);
      }
    }
  }

  public *getCheckableGroups(): Generator<CheckableGroup> {
    for (const standaloneNode of this.standaloneNodes) {
      yield new CheckableGroup([standaloneNode]);
    }
    if (this.verseNodes.length > 0) {
      yield new CheckableGroup(this.verseNodes);
    }
    for (const otherGroup of this.nonVerseNodeGroups) {
      yield new CheckableGroup(otherGroup);
    }
  }
}
