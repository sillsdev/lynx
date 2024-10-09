import { ScriptureNode, ScriptureNodeType } from './scripture-node';

export abstract class ScriptureContainer extends ScriptureNode {
  private readonly _children: ScriptureNode[] = [];

  constructor(children?: ScriptureNode[]) {
    super();
    if (children != null) {
      for (const child of children) {
        this.appendChild(child);
      }
    }
  }

  get children(): readonly ScriptureNode[] {
    return this._children;
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

  clear(): void {
    this._children.length = 0;
  }
}
