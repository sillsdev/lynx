import { Position } from '../common/position';
import { Range } from '../common/range';
import { TextEdit } from '../common/text-edit';
import { Document } from './document';
import { TextDocumentChange } from './text-document-change';

export class TextDocument implements Document {
  private _lineOffsets: number[] | undefined = undefined;
  private _content: string;

  constructor(
    public readonly uri: string,
    public readonly format: string,
    public version: number,
    content: string,
  ) {
    this._content = content;
  }

  get content(): string {
    return this._content;
  }

  getText(range?: Range): string {
    if (range != null) {
      const start = this.offsetAt(range.start);
      const end = this.offsetAt(range.end);
      return this._content.substring(start, end);
    }
    return this._content;
  }

  offsetAt(position: Position): number {
    const lineOffsets = this.getLineOffsets();
    if (position.line >= lineOffsets.length) {
      return this._content.length;
    } else if (position.line < 0) {
      return 0;
    }
    const lineOffset = lineOffsets[position.line];
    if (position.character <= 0) {
      return lineOffset;
    }

    const nextLineOffset =
      position.line + 1 < lineOffsets.length ? lineOffsets[position.line + 1] : this._content.length;
    const offset = Math.min(lineOffset + position.character, nextLineOffset);
    return this.ensureBeforeEndOfLine(offset, lineOffset);
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

    contentOffset = this.ensureBeforeEndOfLine(contentOffset, lineOffsets[line]);
    return { line, character: contentOffset - lineOffsets[line] };
  }

  update(changes: TextDocumentChange[], version: number): void {
    for (const change of changes) {
      this.updateContent(change);
    }
    this.version = version;
  }

  updateContent(change: TextDocumentChange): void {
    if (change.range == null) {
      this._content = change.text;
      this._lineOffsets = undefined;
    } else {
      const range = change.range;
      const startOffset = this.offsetAt(range.start);
      const endOffset = this.offsetAt(range.end);
      this._content =
        this._content.substring(0, startOffset) +
        change.text +
        this._content.substring(endOffset, this._content.length);

      // update the offsets
      const startLine = Math.max(range.start.line, 0);
      const endLine = Math.max(range.end.line, 0);
      let lineOffsets = this._lineOffsets!;
      const addedLineOffsets = computeLineOffsets(change.text, false, startOffset);
      if (endLine - startLine === addedLineOffsets.length) {
        for (let i = 0, len = addedLineOffsets.length; i < len; i++) {
          lineOffsets[i + startLine + 1] = addedLineOffsets[i];
        }
      } else {
        if (addedLineOffsets.length < 10000) {
          lineOffsets.splice(startLine + 1, endLine - startLine, ...addedLineOffsets);
        } else {
          // avoid too many arguments for splice
          this._lineOffsets = lineOffsets = lineOffsets
            .slice(0, startLine + 1)
            .concat(addedLineOffsets, lineOffsets.slice(endLine + 1));
        }
      }
      const diff = change.text.length - (endOffset - startOffset);
      if (diff !== 0) {
        for (let i = startLine + 1 + addedLineOffsets.length, len = lineOffsets.length; i < len; i++) {
          lineOffsets[i] = lineOffsets[i] + diff;
        }
      }
    }
  }

  createTextEdit(startOffset: number, endOffset: number, newText: string): TextEdit[] {
    return [{ range: { start: this.positionAt(startOffset), end: this.positionAt(endOffset) }, newText }];
  }

  private getLineOffsets(): number[] {
    if (this._lineOffsets === undefined) {
      this._lineOffsets = computeLineOffsets(this._content, true);
    }
    return this._lineOffsets;
  }

  private ensureBeforeEndOfLine(offset: number, lineOffset: number): number {
    while (offset > lineOffset && (this._content[offset - 1] === '\r' || this._content[offset - 1] === '\n')) {
      offset--;
    }
    return offset;
  }
}

function computeLineOffsets(text: string, isAtLineStart: boolean, textOffset = 0): number[] {
  const result: number[] = isAtLineStart ? [textOffset] : [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
        i++;
      }
      result.push(textOffset + i + 1);
    }
  }
  return result;
}
