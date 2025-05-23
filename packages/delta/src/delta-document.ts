import { Document, Position, Range } from '@sillsdev/lynx';
import Delta, { Op } from 'quill-delta';

export class DeltaDocument implements Document {
  protected _content: Delta;
  protected lineOffsets: number[] | undefined = undefined;
  protected lineOps: number[] | undefined = undefined;

  constructor(
    public readonly uri: string,
    public readonly format: string,
    public version: number,
    content: Delta,
  ) {
    this._content = content;
  }

  get content(): Delta {
    return this._content;
  }

  update(changes: Op[] | Delta, version: number): void {
    if (Array.isArray(changes)) {
      changes = new Delta(changes);
    }
    const [changeStartOffset, changeEndOffset, insertLength, deleteLength] = getChangeOffsetRange(changes);
    const changeStart = this.positionAt(changeStartOffset);
    const changeEnd = this.positionAt(changeEndOffset);
    let changeStartLine = changeStart.line;
    const changeEndLine = changeEnd.line + 1;

    const updated = this._content.compose(changes);
    const opDiff = updated.ops.length - this._content.ops.length;
    this._content = updated;

    let lineOps = this.lineOps!;
    const opStartIndex = lineOps[changeStartLine];
    while (changeStartLine > 0 && lineOps[changeStartLine - 1] === opStartIndex) {
      changeStartLine--;
    }
    const opEndIndex = lineOps[changeEndLine] + opDiff;
    const subDelta = new Delta(updated.ops.slice(opStartIndex, opEndIndex));
    const addedLineOffsets: number[] = [];
    const addedLineOps: number[] = [];
    computeLineOffsets(
      subDelta,
      addedLineOffsets,
      addedLineOps,
      this.offsetAt({ line: changeStartLine, character: 0 }),
    );

    // update line indexes
    let lineOffsets = this.lineOffsets!;
    const addedLineLength = addedLineOffsets.length;
    const deletedLineLength = changeEndLine - changeStartLine;
    const charDiff = insertLength - deleteLength;
    const lineDiff = addedLineLength - deletedLineLength;
    if (lineDiff === 0) {
      for (let i = 0; i < deletedLineLength; i++) {
        lineOffsets[i + changeStartLine + 1] = addedLineOffsets[i];
        lineOps[i + changeStartLine + 1] = addedLineOps[i];
      }
    } else {
      if (addedLineLength < 10000) {
        lineOffsets.splice(changeStartLine + 1, deletedLineLength, ...addedLineOffsets);
        lineOps.splice(changeStartLine + 1, deletedLineLength, ...addedLineOps);
      } else {
        // avoid too many arguments for splice
        this.lineOffsets = lineOffsets = lineOffsets
          .slice(0, changeStartLine)
          .concat(addedLineOffsets, lineOffsets.slice(changeEndLine));
        this.lineOps = lineOps = lineOps.slice(0, changeStartLine).concat(addedLineOps, lineOps.slice(changeEndLine));
      }
    }

    if (charDiff !== 0 || opDiff !== 0) {
      const newLineLength = lineOffsets.length;
      for (let i = changeStartLine + 1 + addedLineLength; i < newLineLength; i++) {
        if (charDiff !== 0) {
          lineOffsets[i] += charDiff;
        }
        if (opDiff !== 0) {
          lineOps[i] += opDiff;
        }
      }
    }

    this.version = version;
  }

  getText(range?: Range): string {
    let content = this._content;
    if (range != null) {
      const start = this.offsetAt(range.start);
      const end = this.offsetAt(range.end);
      content = this._content.slice(start, end);
    }
    return content.map((op) => (typeof op.insert === 'string' ? op.insert : '\ufffc')).join('');
  }

  positionAt(offset: number, range?: Range): Position {
    const lineOffsets = this.getLineOffsets();
    if (range == null) {
      range = { start: { line: 0, character: 0 }, end: { line: lineOffsets.length - 1, character: 0 } };
    }

    if (range.start.line === range.end.line) {
      return {
        line: range.start.line,
        character: Math.min(range.start.character + offset, range.end.character),
      };
    }

    const startOffset = this.offsetAt(range.start);
    const endOffset = this.offsetAt(range.end);
    if (startOffset === endOffset) {
      return range.start;
    }
    let contentOffset = startOffset + offset;
    contentOffset = Math.max(Math.min(contentOffset, endOffset), 0);

    let low = 0;
    let high = range.end.line + 1;
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

    return { line, character: contentOffset - lineOffsets[line] };
  }

  offsetAt(position: Position): number {
    const lineOffsets = this.getLineOffsets();
    if (position.line >= lineOffsets.length) {
      return lineOffsets[lineOffsets.length - 1] + 1;
    } else if (position.line < 0) {
      return 0;
    }
    const lineOffset = lineOffsets[position.line];
    if (position.character <= 0) {
      return lineOffset;
    }

    const nextLineOffset =
      position.line + 1 < lineOffsets.length ? lineOffsets[position.line + 1] : lineOffsets[lineOffsets.length - 1] + 1;
    return Math.min(lineOffset + position.character, nextLineOffset);
  }

  private getLineOffsets(): number[] {
    if (this.lineOffsets === undefined) {
      this.lineOffsets = [0];
      this.lineOps = [0];
      computeLineOffsets(this._content, this.lineOffsets, this.lineOps);
    }
    return this.lineOffsets;
  }
}

function computeLineOffsets(delta: Delta, lineOffsets: number[], lineOps: number[], textOffset = 0): void {
  let offset = textOffset;
  let i = 0;
  for (const op of delta.ops) {
    if (typeof op.insert === 'string') {
      let startIndex = 0;
      while (startIndex < op.insert.length) {
        const endIndex = op.insert.indexOf('\n', startIndex);
        if (endIndex === -1) {
          break;
        }
        lineOffsets.push(offset + endIndex + 1);
        lineOps.push(endIndex + 1 === op.insert.length ? i + 1 : i);
        startIndex = endIndex + 1;
      }
      offset += op.insert.length;
    } else {
      offset++;
    }
    i++;
  }
}

export function getChangeOffsetRange(change: Delta): [number, number, number, number] {
  if (change.ops.length === 0) {
    return [0, 0, 0, 0];
  }
  let startOffset = 0;
  let i = 0;
  while (change.ops[i].retain != null && change.ops[i].attributes == null) {
    startOffset += change.ops[i].retain as number;
    i++;
  }

  let endOffset = startOffset;
  let insertLength = 0;
  let deleteLength = 0;
  for (; i < change.ops.length; i++) {
    const op = change.ops[i];
    if (op.retain != null) {
      endOffset += op.retain as number;
    } else if (op.delete != null) {
      endOffset += op.delete;
      deleteLength += op.delete;
    } else if (op.insert != null) {
      if (typeof op.insert === 'string') {
        insertLength += op.insert.length;
      } else {
        insertLength += 1;
      }
    }
  }
  return [startOffset, endOffset, insertLength, deleteLength];
}
