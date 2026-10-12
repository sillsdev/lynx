import {
  Position,
  Range,
  ScriptureBook,
  ScriptureCell,
  ScriptureChapter,
  ScriptureCharacterStyle,
  ScriptureMilestone,
  ScriptureNode,
  ScriptureNote,
  ScriptureOptBreak,
  ScriptureParagraph,
  ScriptureRef,
  ScriptureRow,
  ScriptureSidebar,
  ScriptureTable,
  ScriptureText,
  ScriptureTextDocument,
  ScriptureVerse,
  TextDocumentChange,
} from '@sillsdev/lynx';
import {
  UsfmAttribute,
  UsfmParser,
  UsfmParserHandlerBase,
  UsfmParserState,
  UsfmPreserveWhitespaceMode,
  UsfmStylesheet,
  UsfmTokenizer,
  UsfmTokenType,
} from '@sillsdev/machine/corpora';

export class UsfmDocument extends ScriptureTextDocument {
  constructor(
    uri: string,
    format: string,
    version: number,
    content: string,
    private readonly stylesheet: UsfmStylesheet,
    start: Position = { line: 0, character: 0 },
  ) {
    super(uri, format, version, content);
    this.parseUsfm(content, start);
  }

  update(changes: TextDocumentChange[], version: number): void {
    for (const change of changes) {
      if (change.range == null || this.children.length === 0) {
        this.updateContent(change);
        this.parseUsfm(this.content);
        continue;
      }

      // start from a child before the change's line, because the change could extend it
      const startChildIndex = Math.max(this.findLastChildStartingAtOrBefore(change.range.start.line - 1), 0);
      // a line can hold several top-level children (e.g. a verse and its text), and all of them must be reparsed
      const endChildIndex = Math.max(this.findLastChildStartingAtOrBefore(change.range.end.line), startChildIndex);
      const startChild = this.children[startChildIndex];
      const endChild = this.children[endChildIndex];
      const changeStartOffset = this.offsetAt(change.range.start);
      const changeEndOffset = this.offsetAt(change.range.end);
      const childStartOffset = Math.min(this.offsetAt(startChild.range.start), changeStartOffset);
      const childEndOffset = Math.max(this.offsetAt(endChild.range.end), changeEndOffset);
      const usfm =
        this.content.substring(childStartOffset, changeStartOffset) +
        change.text +
        this.content.substring(changeEndOffset, childEndOffset);
      const subDocument = new UsfmDocument(
        this.uri,
        this.format,
        version,
        usfm,
        this.stylesheet,
        this.positionAt(childStartOffset),
      );

      this.spliceChildren(startChildIndex, endChildIndex - startChildIndex + 1, ...subDocument.children);

      const lineDiff =
        countLineBreaks(change.text) - countLineBreaks(this.content.substring(changeStartOffset, changeEndOffset));
      if (lineDiff !== 0) {
        // the remaining children start on lines after the change, so only their line numbers need to be updated
        for (let i = startChildIndex + subDocument.children.length; i < this.children.length; i++) {
          updateNodeLine(this.children[i], lineDiff);
        }
      }
      this.updateContent(change);
    }
    this.version = version;
  }

  private findLastChildStartingAtOrBefore(line: number): number {
    let low = 0;
    let high = this.children.length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (this.children[mid].range.start.line > line) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }
    return low - 1;
  }

  private parseUsfm(content: string, start: Position = { line: 0, character: 0 }): void {
    this.clearChildren();
    const handler = new UsfmDocumentBuilder(this);
    const tokenizer = new UsfmTokenizer(this.stylesheet);
    const tokens = tokenizer.tokenize(
      content,
      UsfmPreserveWhitespaceMode.TextOnly,
      start.line + 1,
      start.character + 1,
    );
    const parser = new UsfmParser(tokens, handler, this.stylesheet);
    parser.processTokens();
  }
}

function updateNodeLine(node: ScriptureNode, lineDiff: number): void {
  node.range.start.line += lineDiff;
  node.range.end.line += lineDiff;
  for (const child of node.children) {
    updateNodeLine(child, lineDiff);
  }
}

function countLineBreaks(text: string): number {
  return text.match(/\r\n|\r|\n/g)?.length ?? 0;
}

class UsfmDocumentBuilder extends UsfmParserHandlerBase {
  private readonly containerStack: ScriptureNode[] = [];

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

  startSidebar(state: UsfmParserState, _marker: string, category: string | undefined): void {
    this.startContainer(state, new ScriptureSidebar(category));
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
    startMilestone: boolean,
    attributes: readonly UsfmAttribute[] | undefined,
  ): void {
    this.appendChild(
      new ScriptureMilestone(
        marker,
        startMilestone,
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

  private startContainer(state: UsfmParserState, containerNode: ScriptureNode): void {
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

  private push(container: ScriptureNode): void {
    this.containerStack.push(container);
  }

  private peek(): ScriptureNode | undefined {
    if (this.containerStack.length === 0) {
      return undefined;
    }
    return this.containerStack[this.containerStack.length - 1];
  }

  private pop(): ScriptureNode | undefined {
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
