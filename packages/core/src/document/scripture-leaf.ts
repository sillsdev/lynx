import { Position } from '../common/position';
import { Range } from '../common/range';
import { ScriptureDocument } from './scripture-document';
import { ScriptureNode, ScriptureNodeType } from './scripture-node';

export abstract class ScriptureLeaf implements ScriptureNode {
  private _parent?: ScriptureNode;
  readonly children: readonly ScriptureNode[] = [];
  readonly isLeaf = true;

  constructor(public range: Range = { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }) {}

  abstract readonly type: ScriptureNodeType;

  get document(): ScriptureDocument | undefined {
    return this._parent?.document;
  }

  get parent(): ScriptureNode | undefined {
    return this._parent;
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

  *getNodes(_filter?: ScriptureNodeType | ((node: ScriptureNode) => boolean)): IterableIterator<ScriptureNode> {
    // return nothing
  }

  positionAt(offset: number): Position {
    if (this.document == null) {
      throw new Error('The node is not part of a document.');
    }
    return this.document.positionAt(offset, this.range);
  }

  appendChild(_child: ScriptureNode): void {
    throw new Error('The method not supported.');
  }

  insertChild(_index: number, _child: ScriptureNode): void {
    throw new Error('The method not supported.');
  }

  removeChild(_child: ScriptureNode): void {
    throw new Error('The method not supported.');
  }

  spliceChildren(_start: number, _deleteCount: number, ..._items: ScriptureNode[]): void {
    throw new Error('The method not supported.');
  }

  clearChildren(): void {
    throw new Error('The method not supported.');
  }
}
