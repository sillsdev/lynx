import {
  Position,
  Range,
  ScriptureCell,
  ScriptureChapter,
  ScriptureCharacterStyle,
  ScriptureDocumentMixin,
  ScriptureMilestone,
  ScriptureNode,
  ScriptureNote,
  ScriptureOptBreak,
  ScriptureParagraph,
  ScriptureRef,
  ScriptureRow,
  ScriptureTable,
  ScriptureText,
  ScriptureVerse,
} from '@sillsdev/lynx';
import isEqual from 'lodash-es/isEqual';
import Delta, { Op } from 'quill-delta';

import { DeltaDocument, getChangeOffsetRange } from './delta-document';

export class ScriptureDeltaDocument extends ScriptureDocumentMixin(DeltaDocument) {
  private lineChildren: number[] | undefined = undefined;

  constructor(uri: string, format: string, version: number, content: Delta) {
    super(uri, format, version, content);
    this.lineOffsets = [0];
    this.lineOps = [0];
    this.lineChildren = [0];
    for (const child of processDelta(content, this.lineOffsets, this.lineChildren, this.lineOps)) {
      this.appendChild(child);
    }
  }

  update(changes: Op[] | Delta, version: number): void {
    if (Array.isArray(changes)) {
      changes = new Delta(changes);
    }
    const [changeStartOffset, changeEndOffset, insertLength, deleteLength] = getChangeOffsetRange(changes);
    const changeStart = this.positionAt(changeStartOffset);
    const changeEnd = this.positionAt(changeEndOffset);
    const changeStartLine = changeStart.line;
    const changeEndLine = changeEnd.line;

    let lineChildren = this.lineChildren!;
    const childStartIndex = lineChildren[changeStartLine];
    const childEndIndex = lineChildren[changeEndLine];
    const childStartLine =
      childStartIndex < this.children.length
        ? this.children[childStartIndex].range.start.line
        : lineChildren.length - 1;
    const childStartPosition =
      childStartIndex < this.children.length
        ? this.children[childStartIndex].range.start
        : this.children[this.children.length - 1].range.end;
    const childEndLine =
      childEndIndex < this.children.length ? this.children[childEndIndex].range.end.line : lineChildren.length - 1;

    const updated = this._content.compose(changes);
    const opDiff = updated.ops.length - this._content.ops.length;
    this._content = updated;

    let lineOps = this.lineOps!;
    const opStartIndex = lineOps[childStartLine];
    const opEndIndex = lineOps[childEndLine];
    const subDelta = new Delta(updated.ops.slice(opStartIndex, opEndIndex + opDiff));
    const addedLineOffsets: number[] = [];
    const addedLineChildren: number[] = [];
    const addedLineOps: number[] = [];
    const children = processDelta(
      subDelta,
      addedLineOffsets,
      addedLineChildren,
      addedLineOps,
      childStartPosition,
      this.offsetAt(childStartPosition),
      childStartIndex,
      opStartIndex,
    );

    // update nodes
    this.spliceChildren(childStartIndex, childEndIndex - childStartIndex + 1, ...children);

    // update line indexes
    let lineOffsets = this.lineOffsets!;
    const addedLineLength = addedLineOffsets.length;
    const deletedLineLength = childEndLine - childStartLine;
    const charDiff = insertLength - deleteLength;
    const lineDiff = addedLineLength - deletedLineLength;
    const childDiff = children.length - 1;
    if (lineDiff === 0) {
      for (let i = 0; i < deletedLineLength; i++) {
        lineOffsets[i + childStartLine + 1] = addedLineOffsets[i];
        lineOps[i + childStartLine + 1] = addedLineOps[i];
        lineChildren[i + childStartLine + 1] = addedLineChildren[i];
      }
    } else {
      if (addedLineLength < 10000) {
        lineOffsets.splice(childStartLine + 1, deletedLineLength, ...addedLineOffsets);
        lineOps.splice(childStartLine + 1, deletedLineLength, ...addedLineOps);
        lineChildren.splice(childStartLine + 1, deletedLineLength, ...addedLineChildren);
      } else {
        // avoid too many arguments for splice
        this.lineOffsets = lineOffsets = lineOffsets
          .slice(0, childStartLine)
          .concat(addedLineOffsets, lineOffsets.slice(childEndLine));
        this.lineOps = lineOps = lineOps.slice(0, childStartLine).concat(addedLineOps, lineOps.slice(childEndLine));
        this.lineChildren = lineChildren = lineChildren
          .slice(0, childStartLine)
          .concat(addedLineChildren, lineChildren.slice(childEndLine));
      }

      for (let i = childEndIndex + childDiff + 1; i < this.children.length; i++) {
        updateNodeLine(this.children[i], lineDiff);
      }
    }

    if (charDiff !== 0 || childDiff !== 0 || opDiff !== 0) {
      const newLineLength = lineOffsets.length;
      for (let i = childStartLine + 1 + addedLineLength; i < newLineLength; i++) {
        if (charDiff !== 0) {
          lineOffsets[i] += charDiff;
        }
        if (opDiff !== 0) {
          lineOps[i] += opDiff;
        }
        if (childDiff !== 0) {
          lineChildren[i] += childDiff;
        }
      }
    }

    this.version = version;
  }
}

function processDelta(
  delta: Delta,
  lineOffsets: number[] = [],
  lineChildren: number[] = [],
  lineOps: number[] = [],
  startPosition: Position = { line: 0, character: 0 },
  startOffset = 0,
  startNodeIndex = 0,
  startOpIndex = 0,
): ScriptureNode[] {
  const content: ScriptureNode[] = [];
  let curCharAttrs: Record<string, unknown>[] = [];
  const childNodes: ScriptureNode[][] = [];
  childNodes.push([]);
  let curTableAttrs: Record<string, any> | undefined = undefined;
  let curRowAttrs: Record<string, any> | undefined = undefined;
  let line = startPosition.line;
  let character = startPosition.character;
  let offset = startOffset;
  let i = startOpIndex;
  let paraStartPosition = startPosition;
  for (const op of delta.ops) {
    if (op.insert == null) {
      throw new Error('The delta is not a document.');
    }

    const attrs = op.attributes;
    if (curCharAttrs.length > 0 && attrs?.char == null) {
      while (curCharAttrs.length > 0) {
        charEnded(childNodes, curCharAttrs);
      }
    } else if (attrs?.char != null) {
      const charAttrs = getCharAttributes(attrs.char);
      while (curCharAttrs.length > 0 && !charAttributesMatch(curCharAttrs, charAttrs)) {
        charEnded(childNodes, curCharAttrs);
      }
      for (let i = curCharAttrs.length; i < charAttrs.length; i++) {
        childNodes.push([]);
      }
      curCharAttrs = charAttrs;
    }

    let length: number;
    if (typeof op.insert === 'string') {
      const text = op.insert;
      length = text.length;
      if (curTableAttrs != null && attrs?.table == null && text === '\n') {
        const nextBlockNodes = rowEnded(childNodes);
        curRowAttrs = undefined;
        tableEnded(content, childNodes);
        curTableAttrs = undefined;
        childNodes[childNodes.length - 1].push(...nextBlockNodes);
      } else if (attrs?.table != null) {
        const cellAttrs = attrs.cell as Record<string, unknown> | undefined;
        let cellNode: ScriptureCell;
        if (cellAttrs != null) {
          const children = childNodes[childNodes.length - 1];
          cellNode = new ScriptureCell(
            cellAttrs.style as string,
            cellAttrs.align as string,
            cellAttrs.colspan as number,
            children,
            { start: paraStartPosition, end: { line: line + 1, character: 0 } },
          );
        } else {
          cellNode = childNodes[childNodes.length - 1][0] as ScriptureCell;
        }
        childNodes.pop();

        if (text === '\n') {
          line += 1;
          character = -1;
          lineOffsets.push(offset + length);
          lineChildren.push(startNodeIndex + content.length);
          lineOps.push(i + 1);
          paraStartPosition = { line, character: 0 };
        }

        const tableAttrs = attrs.table as Record<string, any>;
        const rowAttrs = attrs.row as Record<string, any>;
        if (curTableAttrs != null && curRowAttrs != null) {
          if (rowAttrs.id !== curRowAttrs.id) {
            rowEnded(childNodes);
            curRowAttrs = undefined;
          }
          if (tableAttrs.id !== curTableAttrs.id) {
            tableEnded(content, childNodes);
            curTableAttrs = undefined;
          }
        }

        while (childNodes.length < 2) {
          childNodes.push([]);
        }
        childNodes[childNodes.length - 1].push(cellNode);
        childNodes.push([]);

        curTableAttrs = tableAttrs;
        curRowAttrs = rowAttrs;
      }

      if (attrs == null) {
        let startIndex = 0;
        let implicitParagraph = false;
        let lineCount = 0;
        while (startIndex < text.length) {
          const endIndex = text.indexOf('\n', startIndex);
          const inlineText = text.substring(startIndex, endIndex === -1 ? undefined : endIndex);
          if (inlineText.length > 0) {
            childNodes[childNodes.length - 1].push(
              new ScriptureText(inlineText, {
                start: { line, character },
                end: { line, character: character + inlineText.length },
              }),
            );
          }
          if (endIndex === -1) {
            break;
          }
          implicitParagraph = true;
          lineCount++;
          line++;
          character = 0;
          lineOffsets.push(offset + endIndex + 1);
          lineOps.push(endIndex + 1 === op.insert.length ? i + 1 : i);
          startIndex = endIndex + 1;
        }

        if (implicitParagraph) {
          // implicit paragraph
          const children = childNodes[childNodes.length - 1];
          if (children.length > 0) {
            content.push(
              new ScriptureParagraph('p', undefined, children, {
                start: paraStartPosition,
                end: { line: line, character: 0 },
              }),
            );
            children.length = 0;
          }
          for (let j = 0; j < lineCount; j++) {
            lineChildren.push(startNodeIndex + content.length);
          }
          paraStartPosition = { line, character: 0 };
          character = -1;
        }
      } else {
        // text blots
        for (const [key, value] of Object.entries(attrs)) {
          const textBlotAttrs = value as Record<string, unknown>;
          switch (key) {
            case 'para':
              // end of a para block
              for (let j = 0; j < text.length; j++) {
                const children = childNodes[childNodes.length - 1];
                content.push(
                  new ScriptureParagraph(textBlotAttrs.style as string, getNodeAttributes(textBlotAttrs), children, {
                    start: paraStartPosition,
                    end: { line: line + 1, character: 0 },
                  }),
                );
                lineOffsets.push(offset + j + 1);
                lineChildren.push(startNodeIndex + content.length);
                lineOps.push(i + 1);
                line += 1;
                paraStartPosition = { line, character: 0 };
              }
              childNodes[childNodes.length - 1].length = 0;
              character = -1;
              break;

            case 'ref':
              childNodes[childNodes.length - 1].push(
                new ScriptureRef(textBlotAttrs.display as string, textBlotAttrs.target as string, {
                  start: { line, character },
                  end: { line, character: character + length },
                }),
              );
              break;

            case 'char':
              if (attrs.ref == null) {
                childNodes[childNodes.length - 1].push(
                  new ScriptureText(text, { start: { line, character }, end: { line, character: character + length } }),
                );
              }
              break;

            case 'segment':
              if (Object.keys(attrs).length === 1) {
                childNodes[childNodes.length - 1].push(
                  new ScriptureText(text, { start: { line, character }, end: { line, character: character + length } }),
                );
              }
              break;
          }
        }
      }
    } else {
      // embeds
      const obj = op.insert;
      length = 1;
      for (const [key, value] of Object.entries(obj)) {
        const embedAttrs = value as Record<string, unknown>;
        switch (key) {
          case 'chapter':
            content.push(
              new ScriptureChapter(embedAttrs.number as string, undefined, undefined, undefined, undefined, {
                start: { line, character },
                end: { line: line + 1, character: 0 },
              }),
            );
            lineOffsets.push(offset + length);
            lineChildren.push(startNodeIndex + content.length);
            lineOps.push(i + 1);
            line += 1;
            character = -1;
            paraStartPosition = { line, character: 0 };
            break;

          case 'verse':
            childNodes[childNodes.length - 1].push(
              new ScriptureVerse(embedAttrs.number as string, undefined, undefined, undefined, undefined, {
                start: { line, character },
                end: { line, character: character + length },
              }),
            );
            break;

          case 'figure':
            childNodes[childNodes.length - 1].push(
              new ScriptureCharacterStyle(
                embedAttrs.style as string,
                { file: embedAttrs.file as string, size: embedAttrs.size as string, ref: embedAttrs.ref as string },
                processDelta(new Delta(embedAttrs.content as any)),
                { start: { line, character }, end: { line, character: character + length } },
              ),
            );
            break;

          case 'note':
            childNodes[childNodes.length - 1].push(
              new ScriptureNote(
                embedAttrs.style as string,
                embedAttrs.caller as string,
                embedAttrs.category as string | undefined,
                processDelta(new Delta(embedAttrs.content as any)),
                { start: { line, character }, end: { line, character: character + length } },
              ),
            );
            break;

          case 'ms': {
            const style = embedAttrs.style as string;
            childNodes[childNodes.length - 1].push(
              new ScriptureMilestone(style, !style.endsWith('-e'), undefined, undefined, undefined, {
                start: { line, character },
                end: { line, character: character + length },
              }),
            );
            break;
          }

          case 'optbreak':
            childNodes[childNodes.length - 1].push(
              new ScriptureOptBreak({ start: { line, character }, end: { line, character: character + length } }),
            );
            break;
        }
      }
    }
    offset += length;
    i++;
    if (character === -1) {
      character = 0;
    } else {
      character += length;
    }
  }
  while (curCharAttrs.length > 0) {
    charEnded(childNodes, curCharAttrs);
  }
  if (curTableAttrs != null) {
    rowEnded(childNodes);
    tableEnded(content, childNodes);
  }
  content.push(...childNodes[childNodes.length - 1]);
  return content;
}

function charEnded(childNodes: ScriptureNode[][], curCharAttrs: Record<string, unknown>[]): void {
  const charAttrs = curCharAttrs.pop();
  if (charAttrs == null) {
    return;
  }
  const attrs = getNodeAttributes(charAttrs);
  const children = childNodes[childNodes.length - 1];
  const charStyleNode = new ScriptureCharacterStyle(
    charAttrs.style as string,
    attrs,
    children,
    getContainerRange(children),
  );
  childNodes.pop();
  childNodes[childNodes.length - 1].push(charStyleNode);
}

function getCharAttributes(charAttrs: any): Record<string, any>[] {
  if (Array.isArray(charAttrs)) {
    return [...charAttrs];
  } else if (typeof charAttrs === 'object') {
    return [charAttrs];
  } else {
    return [];
  }
}

function charAttributesMatch(curCharAttrs: Record<string, unknown>[], charAttrs: Record<string, unknown>[]): boolean {
  if (curCharAttrs.length > charAttrs.length) {
    return false;
  }

  for (let i = 0; i < curCharAttrs.length; i++) {
    if (!isEqual(curCharAttrs[i], charAttrs[i])) {
      return false;
    }
  }
  return true;
}

function rowEnded(childNodes: ScriptureNode[][]): ScriptureNode[] {
  if (childNodes.length > 3) {
    throw new Error('A table is not valid in the current location.');
  }

  let nextBlockNodes: ScriptureNode[] | undefined = undefined;
  if (childNodes.length === 3) {
    nextBlockNodes = childNodes.pop();
  }
  const children = childNodes.pop() ?? [];
  const rowNode = new ScriptureRow(children, getContainerRange(children));
  childNodes[childNodes.length - 1].push(rowNode);
  return nextBlockNodes ?? [];
}

function tableEnded(content: ScriptureNode[], childNodes: ScriptureNode[][]): void {
  const children = childNodes[childNodes.length - 1];
  content.push(new ScriptureTable(children, getContainerRange(children)));
  childNodes[childNodes.length - 1].length = 0;
}

function getNodeAttributes(attrs: Record<string, unknown>): Record<string, string> {
  const nodeAttrs: Record<string, string> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value === 'string' && key !== 'id' && key !== 'style' && key !== 'invalid' && key !== 'cid') {
      nodeAttrs[key] = value;
    }
  }
  return nodeAttrs;
}

function getContainerRange(nodes: ScriptureNode[]): Range {
  if (nodes.length === 0) {
    return { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };
  }
  return {
    start: nodes[0].range.start,
    end: nodes[nodes.length - 1].range.end,
  };
}

function updateNodeLine(node: ScriptureNode, lineDiff: number): void {
  node.range.start.line += lineDiff;
  node.range.end.line += lineDiff;
  for (const child of node.children) {
    updateNodeLine(child, lineDiff);
  }
}
