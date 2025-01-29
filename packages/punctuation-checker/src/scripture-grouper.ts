import { ScriptureDocument, ScriptureNode, ScriptureNodeType } from '@sillsdev/lynx';

import { CheckableGroup, ScriptureNodeCheckable } from './checkable';

export class ScriptureTextNodeGrouper {
  private standaloneNodes: ScriptureNode[] = [];
  private nonVerseNodeGroups: ScriptureNode[][] = [];
  private verseNodes: ScriptureNode[] = [];
  private firstVerseNode: ScriptureNode | undefined = undefined;

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
        this.standaloneNodes.push(node);
      } else {
        this.verseNodes.push(node);
      }
    }

    if (node.type === ScriptureNodeType.Verse && this.firstVerseNode === undefined) {
      this.firstVerseNode = node;
    }

    if (ScriptureTextNodeGrouper.prohibitedVerseAncestorTypes.has(node.type)) {
      // create a new group of nodes
      const newNodeGroup: ScriptureNode[] = [];
      for (const child of node.children) {
        this.processNode(child, newNodeGroup);
      }
      if (newNodeGroup.length > 0) {
        this.nonVerseNodeGroups.push(newNodeGroup);
      }
    } else {
      for (const child of node.children) {
        this.processNode(child, currentGroup);
      }
    }
  }

  public *getCheckableGroups(): Generator<CheckableGroup> {
    for (const standaloneNode of this.standaloneNodes) {
      yield new CheckableGroup([new ScriptureNodeCheckable(standaloneNode)]);
    }
    if (this.verseNodes.length > 0) {
      yield new CheckableGroup(this.verseNodes.map((x) => new ScriptureNodeCheckable(x)));
    }
    for (const otherGroup of this.nonVerseNodeGroups) {
      yield new CheckableGroup(otherGroup.map((x) => new ScriptureNodeCheckable(x)));
    }
  }
}
