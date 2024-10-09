import {
  UsfmAttribute,
  UsfmParser,
  UsfmParserHandlerBase,
  UsfmParserState,
  UsfmStylesheet,
  UsfmTokenType,
} from '@sillsdev/machine/corpora';

import { Position } from '../common/position';
import { Range } from '../common/range';
import { DocumentChange } from './document-factory';
import { ScriptureBook } from './scripture-book';
import { ScriptureCell } from './scripture-cell';
import { ScriptureChapter } from './scripture-chapter';
import { ScriptureCharacterStyle } from './scripture-character-style';
import { ScriptureContainer } from './scripture-container';
import { ScriptureDocument } from './scripture-document';
import { ScriptureMilestone } from './scripture-milestone';
import { ScriptureNode } from './scripture-node';
import { ScriptureNote } from './scripture-note';
import { ScriptureOptBreak } from './scripture-optbreak';
import { ScriptureParagraph } from './scripture-paragraph';
import { ScriptureRef } from './scripture-ref';
import { ScriptureRow } from './scripture-row';
import { ScriptureSidebar } from './scripture-sidebar';
import { ScriptureTable } from './scripture-table';
import { ScriptureText } from './scripture-text';
import { ScriptureVerse } from './scripture-verse';

export class UsfmDocument extends ScriptureDocument {
  private lineOffsets: number[] = [];
  private readonly lineChildren: number[] = [];
  private _version: number;
  private _content: string;

  constructor(
    uri: string,
    version: number,
    content: string,
    private readonly stylesheet: UsfmStylesheet,
    start: Position = { line: 0, character: 0 },
    offset = 0,
  ) {
    super(uri);
    this._version = version;
    this._content = content;
    this.parseUsfm(start, offset);
  }

  get version(): number {
    return this._version;
  }

  get content(): string {
    return this._content;
  }

  update(changes: readonly DocumentChange[], version: number): void {
    for (const change of changes) {
      if (change.range == null) {
        this._content = change.text;
      } else {
        const startLine = Math.max(change.range.start.line, 0);
        const endLine = Math.max(change.range.end.line, 0);
        const startChildIndex = this.lineChildren[startLine];
        const endChildIndex = this.lineChildren[endLine];
        const startChild = this.children[startChildIndex];
        const endChild = this.children[endChildIndex];
        const childStartOffset = this.offsetAt(startChild.range.start);
        const childEndOffset = this.offsetAt(endChild.range.end);
        const changeStartOffset = this.offsetAt(change.range.start);
        const changeEndOffset = this.offsetAt(change.range.end);
        const usfm =
          this._content.substring(childStartOffset, changeStartOffset) +
          change.text +
          this._content.substring(changeEndOffset, childEndOffset);
        const subDocument = new UsfmDocument(
          this.uri,
          this._version,
          usfm,
          this.stylesheet,
          startChild.range.start,
          childStartOffset,
        );

        // update nodes
        this.spliceChildren(startChildIndex, endChildIndex - startChildIndex + 1, ...subDocument.children);

        // update content
        this._content =
          this._content.substring(0, changeStartOffset) +
          change.text +
          this._content.substring(changeEndOffset, this._content.length);

        // update line offsets
        const addedLineOffsets = subDocument.lineOffsets;
        if (endLine - startLine === addedLineOffsets.length) {
          for (let i = 0, len = addedLineOffsets.length; i < len; i++) {
            this.lineOffsets[i + startLine + 1] = addedLineOffsets[i];
          }
        } else {
          if (addedLineOffsets.length < 10000) {
            this.lineOffsets.splice(startLine + 1, endLine - startLine, ...addedLineOffsets);
          } else {
            // avoid too many arguments for splice
            this.lineOffsets = this.lineOffsets
              .slice(0, startLine + 1)
              .concat(addedLineOffsets, this.lineOffsets.slice(endLine + 1));
          }
        }
        const diff = change.text.length - (changeEndOffset - changeStartOffset);
        if (diff !== 0) {
          for (let i = startLine + 1 + addedLineOffsets.length, len = this.lineOffsets.length; i < len; i++) {
            this.lineOffsets[i] = this.lineOffsets[i] + diff;
          }
        }
      }
    }
    this._version = version;
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
    if (position.line >= this.lineOffsets.length) {
      return this._content.length;
    } else if (position.line < 0) {
      return 0;
    }
    const lineOffset = this.lineOffsets[position.line];
    if (position.character <= 0) {
      return lineOffset;
    }

    const nextLineOffset =
      position.line + 1 < this.lineOffsets.length ? this.lineOffsets[position.line + 1] : this._content.length;
    const offset = Math.min(lineOffset + position.character, nextLineOffset);
    return this.ensureBeforeEndOfLine(offset, lineOffset);
  }

  private ensureBeforeEndOfLine(offset: number, lineOffset: number): number {
    while (offset > lineOffset && (this._content[offset - 1] === '\r' || this._content[offset - 1] === '\n')) {
      offset--;
    }
    return offset;
  }

  private parseUsfm(start: Position, offset: number): void {
    const handler = new UsfmDocumentBuilder(this);
    const parser = new UsfmParser(this._content, handler, this.stylesheet);
    parser.state.lineNumber = start.line + 1;
    parser.state.columnNumber = start.character + 1;
    let prevLine = 0;
    while (parser.processToken()) {
      if (prevLine !== parser.state.lineNumber) {
        for (let i = prevLine + 1; i < parser.state.lineNumber; i++) {
          this.lineChildren.push(this.children.length - 2);
        }
        this.lineChildren.push(this.children.length - 1);
        prevLine = parser.state.lineNumber;
      }
    }
    this.lineOffsets = computeLineOffsets(this._content, false, offset);
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

class UsfmDocumentBuilder extends UsfmParserHandlerBase {
  private readonly containerStack: ScriptureContainer[] = [];

  constructor(public readonly document: UsfmDocument) {
    super();
    this.push(this.document);
  }

  startUsfm(state: UsfmParserState): void {
    this.document.range.start = { line: state.lineNumber - 1, character: state.columnNumber - 1 };
  }

  endUsfm(state: UsfmParserState): void {
    this.document.range.end = { line: state.lineNumber - 1, character: state.columnNumber - 1 };
  }

  startBook(state: UsfmParserState, _marker: string, code: string): void {
    this.startContainer(state, new ScriptureBook(code));
  }

  endBook(state: UsfmParserState, _marker: string): void {
    this.endContainer(state, false);
  }

  startPara(
    state: UsfmParserState,
    marker: string,
    _unknown: boolean,
    attributes: readonly UsfmAttribute[] | undefined,
  ): void {
    this.startContainer(state, new ScriptureParagraph(marker, UsfmDocumentBuilder.convertAttributes(attributes)));
  }

  endPara(state: UsfmParserState, _marker: string): void {
    this.endContainer(state, false);
  }

  startChar(
    state: UsfmParserState,
    markerWithoutPlus: string,
    _unknown: boolean,
    attributes: readonly UsfmAttribute[] | undefined,
  ): void {
    this.startContainer(
      state,
      new ScriptureCharacterStyle(markerWithoutPlus, UsfmDocumentBuilder.convertAttributes(attributes)),
    );
  }

  endChar(
    state: UsfmParserState,
    _marker: string,
    _attributes: readonly UsfmAttribute[] | undefined,
    closed: boolean,
  ): void {
    this.endContainer(state, closed);
  }

  startNote(state: UsfmParserState, marker: string, caller: string, category: string | undefined): void {
    this.startContainer(state, new ScriptureNote(marker, caller, category));
  }

  endNote(state: UsfmParserState, _marker: string, closed: boolean): void {
    this.endContainer(state, closed);
  }

  startTable(state: UsfmParserState): void {
    this.startContainer(state, new ScriptureTable());
  }

  endTable(state: UsfmParserState): void {
    this.endContainer(state, false);
  }

  startRow(state: UsfmParserState, _marker: string): void {
    this.startContainer(state, new ScriptureRow());
  }

  endRow(state: UsfmParserState, _marker: string): void {
    this.endContainer(state, false);
  }

  startCell(state: UsfmParserState, marker: string, align: string, colspan: number): void {
    this.startContainer(state, new ScriptureCell(marker, align, colspan));
  }

  endCell(state: UsfmParserState, _marker: string): void {
    this.endContainer(state, false);
  }

  startSidebar(state: UsfmParserState, marker: string, category: string | undefined): void {
    this.startContainer(state, new ScriptureSidebar(marker, category));
  }

  endSidebar(state: UsfmParserState, _marker: string, closed: boolean): void {
    this.endContainer(state, closed);
  }

  chapter(
    state: UsfmParserState,
    number: string,
    _marker: string,
    altNumber: string | undefined,
    pubNumber: string | undefined,
  ): void {
    this.appendChild(
      new ScriptureChapter(
        number,
        altNumber,
        pubNumber,
        undefined,
        undefined,
        UsfmDocumentBuilder.getInlineRange(state),
      ),
    );
  }

  verse(
    state: UsfmParserState,
    number: string,
    _marker: string,
    altNumber: string | undefined,
    pubNumber: string | undefined,
  ): void {
    this.appendChild(
      new ScriptureVerse(number, altNumber, pubNumber, undefined, undefined, UsfmDocumentBuilder.getInlineRange(state)),
    );
  }

  text(state: UsfmParserState, text: string): void {
    this.appendChild(new ScriptureText(text, UsfmDocumentBuilder.getInlineRange(state)));
  }

  milestone(
    state: UsfmParserState,
    marker: string,
    _startMilestone: boolean,
    attributes: readonly UsfmAttribute[] | undefined,
  ): void {
    this.appendChild(
      new ScriptureMilestone(
        marker,
        undefined,
        undefined,
        UsfmDocumentBuilder.convertAttributes(attributes),
        UsfmDocumentBuilder.getInlineRange(state),
      ),
    );
  }

  ref(state: UsfmParserState, _marker: string, display: string, target: string): void {
    this.appendChild(new ScriptureRef(display, target, UsfmDocumentBuilder.getInlineRange(state)));
  }

  optBreak(state: UsfmParserState): void {
    this.appendChild(
      new ScriptureOptBreak({
        start: { line: state.lineNumber - 1, character: state.columnNumber - 1 },
        end: { line: state.lineNumber - 1, character: state.columnNumber + 1 },
      }),
    );
  }

  private startContainer(state: UsfmParserState, containerNode: ScriptureContainer): void {
    containerNode.range.start = { line: state.lineNumber - 1, character: state.columnNumber - 1 };
    this.peek()?.appendChild(containerNode);
    this.push(containerNode);
  }

  private endContainer(state: UsfmParserState, closed: boolean): void {
    const containerNode = this.pop();
    if (containerNode != null) {
      if (closed) {
        containerNode.range.end = {
          line: state.lineNumber - 1,
          character: state.columnNumber + UsfmDocumentBuilder.getLastTokenLength(state, state.index) - 1,
        };
      } else if (state.index === state.tokens.length - 1) {
        containerNode.range.end = {
          line: state.lineNumber - 1,
          character: state.columnNumber - 1,
        };
      } else {
        containerNode.range.end = {
          line: state.prevToken!.lineNumber - 1,
          character: state.prevToken!.columnNumber + UsfmDocumentBuilder.getLastTokenLength(state, state.index - 1) - 1,
        };
      }
    }
  }

  private push(container: ScriptureContainer): void {
    this.containerStack.push(container);
  }

  private peek(): ScriptureContainer | undefined {
    if (this.containerStack.length === 0) {
      return undefined;
    }
    return this.containerStack[this.containerStack.length - 1];
  }

  private pop(): ScriptureContainer | undefined {
    return this.containerStack.pop();
  }

  private appendChild(node: ScriptureNode): void {
    return this.peek()?.appendChild(node);
  }

  private static convertAttributes(
    attributes: readonly UsfmAttribute[] | undefined,
  ): Record<string, string> | undefined {
    if (attributes == null) {
      return undefined;
    }
    const result: Record<string, string> = {};
    for (const attribute of attributes) {
      result[attribute.name] = attribute.value;
    }
    return result;
  }

  private static getInlineRange(state: UsfmParserState): Range {
    let length = 0;
    let index = state.index;
    for (; index < state.index + state.specialTokenCount; index++) {
      length += state.tokens[index].getLength();
    }
    length += UsfmDocumentBuilder.getLastTokenLength(state, index);

    return {
      start: { line: state.lineNumber - 1, character: state.columnNumber - 1 },
      end: { line: state.lineNumber - 1, character: state.columnNumber + length - 1 },
    };
  }

  private static getLastTokenLength(state: UsfmParserState, index: number): number {
    if (state.tokens[index].type === UsfmTokenType.Text) {
      const text = state.tokens[index].text!;
      let length = text.length;
      if (
        (index === state.tokens.length - 1 ||
          state.tokens[index + 1].type === UsfmTokenType.Paragraph ||
          state.tokens[index + 1].type === UsfmTokenType.Book ||
          state.tokens[index + 1].type === UsfmTokenType.Chapter) &&
        text.length > 0 &&
        text.endsWith(' ')
      ) {
        length--;
      }
      return length;
    }
    return state.tokens[index].getLength(false, false);
  }
}
