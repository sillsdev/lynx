import { Position } from '../common/position';
import { Range } from '../common/range';
import { ScriptureContainer } from './scripture-container';
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

export abstract class ScriptureNode {
  private _parent?: ScriptureContainer;

  constructor(public range: Range = { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }) {}

  abstract readonly type: ScriptureNodeType;

  get document(): ScriptureDocument | undefined {
    return this._parent?.document;
  }

  get parent(): ScriptureContainer | undefined {
    return this._parent;
  }

  updateParent(parent: ScriptureContainer | undefined): void {
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
    if (this.range.start.line === this.range.end.line) {
      return {
        line: this.range.start.line,
        character: Math.min(this.range.start.character + offset, this.range.end.character),
      };
    }

    const startOffset = this.document.offsetAt(this.range.start);
    const endOffset = this.document.offsetAt(this.range.end);
    if (startOffset === endOffset) {
      return this.range.start;
    }
    let contentOffset = startOffset + offset;
    contentOffset = Math.max(Math.min(contentOffset, endOffset), 0);

    const lineOffsets = this.document.getLineOffsets();
    let low = 0;
    let high = this.range.end.line + 1;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (lineOffsets[mid] > contentOffset) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }
    // low is the least x for which the line offset is larger than the current offset
    // or array.length if no line offset is larger than the current offset
    const line = low - 1;

    contentOffset = this.document.ensureBeforeEndOfLine(contentOffset, lineOffsets[line]);
    return { line, character: contentOffset - lineOffsets[line] };
  }
}
