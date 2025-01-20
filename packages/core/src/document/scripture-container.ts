import { Position } from '../common/position';
import { Range } from '../common/range';
import { ScriptureChildren, ScriptureDocument, ScriptureNode, ScriptureNodeType } from './scripture-document';

export abstract class ScriptureContainer implements ScriptureNode {
  parent?: ScriptureNode;
  next?: ScriptureNode;
  previous?: ScriptureNode;
  private readonly _children = new ScriptureChildren(this);
  readonly isLeaf = false;

  constructor(
    children?: ScriptureNode[],
    public range: Range = { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
  ) {
    if (children != null) {
      for (const child of children) {
        this.appendChild(child);
      }
    }
  }

  abstract readonly type: ScriptureNodeType;

  get document(): ScriptureDocument | undefined {
    return this.parent?.document;
  }

  get children(): readonly ScriptureNode[] {
    return this._children.nodes;
  }

  remove(): void {
    if (this.parent == null) {
      throw new Error('The node does not have a parent.');
    }
    this.parent.removeChild(this);
  }

  getText(): string {
    if (this.document == null) {
      throw new Error('The node is not part of a document.');
    }
    return this.document.getText(this.range);
  }

  findNodes(
    filter?: ScriptureNodeType | ((node: ScriptureNode) => boolean) | ScriptureNodeType[],
  ): IterableIterator<ScriptureNode> {
    return this._children.find(filter);
  }

  positionAt(offset: number): Position {
    if (this.document == null) {
      throw new Error('The node is not part of a document.');
    }
    return this.document.positionAt(offset, this.range);
  }

  appendChild(child: ScriptureNode): void {
    this._children.append(child);
  }

  insertChild(index: number, child: ScriptureNode): void {
    this._children.insert(index, child);
  }

  removeChild(child: ScriptureNode): void {
    this._children.remove(child);
  }

  spliceChildren(start: number, deleteCount: number, ...items: ScriptureNode[]): void {
    this._children.splice(start, deleteCount, ...items);
  }

  clearChildren(): void {
    this._children.clear();
  }
}
