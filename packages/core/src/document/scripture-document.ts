import { Position } from '../common/position';
import { Range } from '../common/range';
import { Document } from './document';

export interface ScriptureDocument extends Document, ScriptureNode {
  getText(range?: Range): string;
  positionAt(offset: number, range?: Range): Position;
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
  readonly document?: ScriptureDocument;
  parent?: ScriptureNode;
  next?: ScriptureNode;
  previous?: ScriptureNode;
  readonly children: readonly ScriptureNode[];
  range: Range;
  readonly isLeaf: boolean;

  remove(): void;
  getText(): string;
  findNodes(
    filter?: ScriptureNodeType | ((node: ScriptureNode) => boolean) | ScriptureNodeType[],
  ): IterableIterator<ScriptureNode>;
  positionAt(offset: number): Position;
  appendChild(child: ScriptureNode): void;
  insertChild(index: number, child: ScriptureNode): void;
  removeChild(child: ScriptureNode): void;
  spliceChildren(start: number, deleteCount: number, ...items: ScriptureNode[]): void;
  clearChildren(): void;
}

export class ScriptureChildren {
  private readonly _nodes: ScriptureNode[] = [];

  constructor(private readonly parent: ScriptureNode) {}

  get nodes(): readonly ScriptureNode[] {
    return this._nodes;
  }

  find(
    filter?: ScriptureNodeType | ((node: ScriptureNode) => boolean) | ScriptureNodeType[],
  ): IterableIterator<ScriptureNode> {
    return findScriptureNodes(this._nodes, filter);
  }

  append(child: ScriptureNode): void {
    this._nodes.push(child);
    child.parent = this.parent;
    child.next = undefined;
    child.previous = this._nodes.length === 1 ? undefined : this._nodes[this._nodes.length - 2];
    if (child.previous != null) {
      child.previous.next = child;
    }
  }

  insert(index: number, child: ScriptureNode): void {
    this._nodes.splice(index, 0, child);
    child.parent = this.parent;
    child.next = index >= this._nodes.length - 1 ? undefined : this._nodes[index + 1];
    if (child.next != null) {
      child.next.previous = child;
    }
    child.previous = index === 0 ? undefined : this._nodes[index - 1];
    if (child.previous != null) {
      child.previous.next = child;
    }
  }

  remove(child: ScriptureNode): void {
    const index = this._nodes.indexOf(child);
    if (index === -1) {
      throw new Error('The parent does not contain the specified child.');
    }
    this._nodes.splice(index, 1);
    child.parent = undefined;
    if (child.next != null) {
      child.next.previous = child.previous;
    }
    if (child.previous != null) {
      child.previous.next = child.next;
    }
    child.next = undefined;
    child.previous = undefined;
  }

  splice(start: number, deleteCount: number, ...items: ScriptureNode[]): void {
    const removed = this._nodes.splice(start, deleteCount, ...items);
    for (const child of removed) {
      child.parent = undefined;
      child.next = undefined;
      child.previous = undefined;
    }
    let index = start;
    for (const child of items) {
      child.parent = this.parent;
      child.next = index >= this._nodes.length - 1 ? undefined : this._nodes[index + 1];
      if (child.next != null) {
        child.next.previous = child;
      }
      child.previous = index === 0 ? undefined : this._nodes[index - 1];
      if (child.previous != null) {
        child.previous.next = child;
      }
      index++;
    }
  }

  clear(): void {
    for (const child of this._nodes) {
      child.parent = undefined;
      child.next = undefined;
      child.previous = undefined;
    }
    this._nodes.length = 0;
  }
}

function* findScriptureNodes(
  nodes: readonly ScriptureNode[],
  filter?: ScriptureNodeType | ((node: ScriptureNode) => boolean) | ScriptureNodeType[],
): IterableIterator<ScriptureNode> {
  for (const child of nodes) {
    if (
      filter == null ||
      (Array.isArray(filter) && filter.includes(child.type)) ||
      (typeof filter === 'function' && filter(child)) ||
      child.type === filter
    ) {
      yield child;
    }
    yield* findScriptureNodes(child.children, filter);
  }
}

type DocumentConstructor = new (...args: any[]) => Document;
export function ScriptureDocumentMixin<TBase extends DocumentConstructor>(Base: TBase) {
  return class extends Base implements ScriptureDocument {
    readonly _children = new ScriptureChildren(this);
    readonly type = ScriptureNodeType.Document;
    readonly document = this;
    readonly parent = undefined;
    readonly next = undefined;
    readonly previous = undefined;
    readonly isLeaf = false;
    range: Range = { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };

    get children(): readonly ScriptureNode[] {
      return this._children.nodes;
    }

    findNodes(
      filter?: ScriptureNodeType | ((node: ScriptureNode) => boolean) | ScriptureNodeType[],
    ): IterableIterator<ScriptureNode> {
      return this._children.find(filter);
    }

    remove(): void {
      throw new Error('The method is not supported.');
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
  };
}
