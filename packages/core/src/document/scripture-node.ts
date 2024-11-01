import { Position } from '../common/position';
import { Range } from '../common/range';
import { ScriptureDocument } from './scripture-document';

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
