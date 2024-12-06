import { Document, Position, Range } from '@sillsdev/lynx';
import Delta, { Op } from 'quill-delta';

export class DeltaDocument implements Document {
  private _content: Delta;
  private _lineOffsets: number[] | undefined = undefined;

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

  update(changes: readonly Op[], version: number): void {
    this._content = this._content.compose(new Delta(changes as Op[]));
    this._lineOffsets = undefined;
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
    if (this._lineOffsets === undefined) {
      this._lineOffsets = computeLineOffsets(this._content, true);
    }
    return this._lineOffsets;
  }
}

function computeLineOffsets(delta: Delta, isAtLineStart: boolean, textOffset = 0): number[] {
  const result: number[] = isAtLineStart ? [textOffset] : [];
  let i = textOffset;
  delta.eachLine((line) => {
    i += line.length() + 1;
    result.push(i);
  });
  return result;
}
