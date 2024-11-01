import { Position } from '../common/position';
import { Range } from '../common/range';
import { ScriptureDocument } from './scripture-document';
import { findNodes, ScriptureNode, ScriptureNodeType } from './scripture-node';

export abstract class ScriptureContainer implements ScriptureNode {
  private _parent?: ScriptureNode;
  private readonly _children: ScriptureNode[] = [];
  readonly isLeaf = false;
  range: Range = { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };

  constructor(children?: ScriptureNode[]) {
    if (children != null) {
      for (const child of children) {
        this.appendChild(child);
      }
    }
  }

  abstract readonly type: ScriptureNodeType;

  get document(): ScriptureDocument | undefined {
    return this._parent?.document;
  }

  get parent(): ScriptureNode | undefined {
    return this._parent;
  }

  get children(): readonly ScriptureNode[] {
    return this._children;
  }

  updateParent(parent: ScriptureNode | undefined): void {
    this._parent = parent;
  }

  remove(): void {
    if (this._parent == null) {
      throw new Error('The node does not have a parent.');
    }
    this._parent.removeChild(this);
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
    return findNodes(this, filter);
  }

  positionAt(offset: number): Position {
    if (this.document == null) {
      throw new Error('The node is not part of a document.');
    }
    return this.document.positionAt(offset, this.range);
  }

  appendChild(child: ScriptureNode): void {
    this._children.push(child);
    child.updateParent(this);
  }

  insertChild(index: number, child: ScriptureNode): void {
    this._children.splice(index, 0, child);
    child.updateParent(this);
  }

  removeChild(child: ScriptureNode): void {
    if (child.parent !== this) {
      throw new Error('This node does not contain the specified child.');
    }
    const index = this._children.indexOf(child);
    if (index === -1) {
      throw new Error('This node does not contain the specified child.');
    }
    this._children.splice(index, 1);
    child.updateParent(undefined);
  }

  spliceChildren(start: number, deleteCount: number, ...items: ScriptureNode[]): void {
    const removed = this._children.splice(start, deleteCount, ...items);
    for (const child of removed) {
      child.updateParent(undefined);
    }
    for (const child of items) {
      child.updateParent(this);
    }
  }

  clearChildren(): void {
    this._children.length = 0;
  }
}
