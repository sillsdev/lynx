import {
  UsfmAttribute,
  UsfmParser,
  UsfmParserHandlerBase,
  UsfmParserState,
  UsfmStylesheet,
  UsfmTokenType,
} from '@sillsdev/machine/corpora';

import { Range } from '../common/range';
import { DocumentChange, DocumentFactory } from './document-factory';
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

export class UsfmDocumentFactory implements DocumentFactory<ScriptureDocument> {
  constructor(private readonly styleSheet: UsfmStylesheet) {}

  create(uri: string, format: string, version: number, content: string): ScriptureDocument {
    const document = new ScriptureDocument(uri, format, version, content);
    const handler = new ScriptureBookHandler(document);
    const parser = new UsfmParser(content, handler, this.styleSheet);
    let index = 0;
    while (parser.processToken()) {
      const token = parser.state.token;
      if (token == null) {
        continue;
      }

      index += token.getLength();
      if (token.type === UsfmTokenType.Text && token.text?.endsWith('\n')) {
        document.lineOffsets.push(index);
      }
    }
    return document;
  }

  update(document: ScriptureDocument, _changes: readonly DocumentChange[], _version: number): ScriptureDocument {
    return document;
  }
}

class ScriptureBookHandler extends UsfmParserHandlerBase {
  private readonly containerStack: ScriptureContainer[] = [];

  constructor(public readonly document: ScriptureDocument) {
    super();
    this.push(this.document);
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
    this.startContainer(state, new ScriptureParagraph(marker, ScriptureBookHandler.convertAttributes(attributes)));
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
      new ScriptureCharacterStyle(markerWithoutPlus, ScriptureBookHandler.convertAttributes(attributes)),
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
        ScriptureBookHandler.getInlineRange(state),
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
      new ScriptureVerse(
        number,
        altNumber,
        pubNumber,
        undefined,
        undefined,
        ScriptureBookHandler.getInlineRange(state),
      ),
    );
  }

  text(state: UsfmParserState, text: string): void {
    this.appendChild(new ScriptureText(text, ScriptureBookHandler.getInlineRange(state)));
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
        ScriptureBookHandler.convertAttributes(attributes),
        ScriptureBookHandler.getInlineRange(state),
      ),
    );
  }

  ref(state: UsfmParserState, _marker: string, display: string, target: string): void {
    this.appendChild(new ScriptureRef(display, target, ScriptureBookHandler.getInlineRange(state)));
  }

  optBreak(state: UsfmParserState): void {
    this.appendChild(
      new ScriptureOptBreak({
        start: { line: state.lineNumber, character: state.columnNumber },
        end: { line: state.lineNumber, character: state.columnNumber + 2 },
      }),
    );
  }

  private startContainer(state: UsfmParserState, containerNode: ScriptureContainer): void {
    containerNode.range.start = { line: state.lineNumber, character: state.columnNumber };
    this.peek()?.appendChild(containerNode);
    this.push(containerNode);
  }

  private endContainer(state: UsfmParserState, closed: boolean): void {
    const containerNode = this.pop();
    if (containerNode != null) {
      containerNode.range.end = {
        line: state.lineNumber,
        character: state.columnNumber + (closed && state.token != null ? state.token.getLength() : 0),
      };
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
    for (let index = state.index; index < state.index + state.specialTokenCount + 1; index++) {
      length += state.tokens[index].getLength();
    }

    return {
      start: { line: state.lineNumber, character: state.columnNumber },
      end: { line: state.lineNumber, character: state.columnNumber + length },
    };
  }
}
