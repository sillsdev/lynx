import { Position } from '../common/position';
import { Range } from '../common/range';
import { Document } from './document';
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

  findNodes(
    filter?: ScriptureNodeType | ((node: ScriptureNode) => boolean) | ScriptureNodeType[],
  ): IterableIterator<ScriptureNode> {
    return findNodes(this, filter);
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

export enum ScriptureNodeType {
  Document,
  Book,
  Paragraph,
  Chapter,
  Verse,
  Milestone,
  Text,
  CharacterStyle,
  Note,
  Table,
  Row,
  Cell,
  Ref,
  OptBreak,
  Sidebar,
}

export interface ScriptureNode {
  readonly type: ScriptureNodeType;
  readonly document: ScriptureDocument | undefined;
  readonly parent: ScriptureNode | undefined;
  readonly children: readonly ScriptureNode[];
  range: Range;
  readonly isLeaf: boolean;

  updateParent(parent: ScriptureNode | undefined): void;
  remove(): void;
  getText(): string;
  findNodes(filter?: ScriptureNodeType | ((node: ScriptureNode) => boolean)): IterableIterator<ScriptureNode>;
  positionAt(offset: number): Position;
  appendChild(child: ScriptureNode): void;
  insertChild(index: number, child: ScriptureNode): void;
  removeChild(child: ScriptureNode): void;
  spliceChildren(start: number, deleteCount: number, ...items: ScriptureNode[]): void;
  clearChildren(): void;
}

export function* findNodes(
  node: ScriptureNode,
  filter?: ScriptureNodeType | ((node: ScriptureNode) => boolean) | ScriptureNodeType[],
): IterableIterator<ScriptureNode> {
  for (const child of node.children) {
    if (
      filter == null ||
      (Array.isArray(filter) && filter.includes(child.type)) ||
      (typeof filter === 'function' && filter(child)) ||
      child.type === filter
    ) {
      yield child;
    }
    yield* findNodes(child, filter);
  }
}
