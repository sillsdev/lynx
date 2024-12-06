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
  UsfmStylesheet,
  UsfmTokenizer,
  UsfmTokenType,
} from '@sillsdev/machine/corpora';

export class UsfmDocument extends ScriptureTextDocument {
  private lineChildren: number[] = [];

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
      if (change.range == null) {
        this.parseUsfm(change.text);
      } else {
        let startChangeLine = Math.max(change.range.start.line, 0);
        let endChangeLine = Math.max(change.range.end.line, 0);
        if (change.range.end.character === 0) {
          endChangeLine--;
          if (endChangeLine < startChangeLine) {
            startChangeLine = endChangeLine;
          }
        }
        const startChildIndex = this.lineChildren[startChangeLine];
        const endChildIndex = this.lineChildren[endChangeLine];
        const startChild = this.children[startChildIndex];
        const endChild = this.children[endChildIndex];
        const childStartOffset = this.offsetAt(startChild.range.start);
        let childEndOffset = this.offsetAt(endChild.range.end);
        const changeStartOffset = this.offsetAt(change.range.start);
        const changeEndOffset = this.offsetAt(change.range.end);
        if (changeEndOffset > childEndOffset) {
          childEndOffset = changeEndOffset;
        }
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
          startChild.range.start,
        );

        // update nodes
        this.spliceChildren(startChildIndex, endChildIndex - startChildIndex + 1, ...subDocument.children);

        // update line children
        const startLine = startChild.range.start.line;
        const endLine = endChild.range.end.line;
        const addedLineChildren = subDocument.lineChildren.map((index) => index + startChildIndex);
        const lineDiff = addedLineChildren.length - (endLine - startLine + 1);
        const childDiff = subDocument.children.length - 1;
        if (lineDiff === 0) {
          for (let i = 0; i < addedLineChildren.length; i++) {
            this.lineChildren[i + startLine] = addedLineChildren[i];
          }
        } else {
          if (addedLineChildren.length < 10000) {
            this.lineChildren.splice(startLine, endLine - startLine + 1, ...addedLineChildren);
          } else {
            // avoid too many arguments for splice
            this.lineChildren = this.lineChildren
              .slice(0, startLine)
              .concat(addedLineChildren, this.lineChildren.slice(endLine + 1));
          }

          for (let i = endChildIndex + childDiff + 1; i < this.children.length; i++) {
            updateNodeLine(this.children[i], lineDiff);
          }
        }
        if (childDiff !== 0) {
          for (let i = endLine + lineDiff + 1; i < this.lineChildren.length; i++) {
            this.lineChildren[i] += childDiff;
          }
        }
      }
      this.updateContent(change);
    }
    this.version = version;
  }

  clearChildren(): void {
    super.clearChildren();
    this.lineChildren.length = 0;
  }

  private parseUsfm(content: string, start: Position = { line: 0, character: 0 }): void {
    this.clearChildren();
    const handler = new UsfmDocumentBuilder(this);
    const tokenizer = new UsfmTokenizer(this.stylesheet);
    const tokens = tokenizer.tokenize(content, false, start.line + 1, start.character + 1);
    const parser = new UsfmParser(tokens, handler, this.stylesheet);
    let prevLine = start.line;
    while (parser.processToken()) {
      if (prevLine !== parser.state.lineNumber) {
        for (let i = prevLine + 1; i < parser.state.lineNumber; i++) {
          this.lineChildren.push(this.children.length - 2);
        }
        this.lineChildren.push(this.children.length - 1);
        prevLine = parser.state.lineNumber;
      }
    }
  }
}

function updateNodeLine(node: ScriptureNode, lineDiff: number): void {
  node.range.start.line += lineDiff;
  node.range.end.line += lineDiff;
  for (const child of node.children) {
    updateNodeLine(child, lineDiff);
  }
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
