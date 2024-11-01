import { Range } from '../common';
import { Document } from './document';
import { ScriptureNode, ScriptureNodeType } from './scripture-node';
import { TextDocument } from './text-document';

export class ScriptureDocument extends TextDocument implements Document, ScriptureNode {
  private readonly _children: ScriptureNode[] = [];
  readonly parent: undefined = undefined;
  readonly isLeaf = false;
  readonly type = ScriptureNodeType.Document;
  readonly document = this;
  range: Range = { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };

  constructor(
    public readonly uri: string,
    version: number,
    content: string,
    children?: ScriptureNode[],
  ) {
    super(uri, version, content);
    if (children != null) {
      for (const child of children) {
        this.appendChild(child);
      }
    }
  }

  get children(): readonly ScriptureNode[] {
    return this._children;
  }

  updateParent(_parent: ScriptureNode | undefined): void {
    throw new Error('The method is not supported.');
  }

  remove(): void {
    throw new Error('The method is not supported.');
  }

  *getNodes(filter?: ScriptureNodeType | ((node: ScriptureNode) => boolean)): IterableIterator<ScriptureNode> {
    for (const child of this._children) {
      if (filter == null || child.type === filter || (typeof filter === 'function' && filter(child))) {
        yield child;
      }
      yield* child.getNodes(filter);
    }
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
