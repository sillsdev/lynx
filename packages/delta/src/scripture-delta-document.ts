import {
  findScriptureNodes,
  Range,
  ScriptureCell,
  ScriptureChapter,
  ScriptureCharacterStyle,
  ScriptureDocument,
  ScriptureMilestone,
  ScriptureNode,
  ScriptureNodeType,
  ScriptureNote,
  ScriptureOptBreak,
  ScriptureParagraph,
  ScriptureRef,
  ScriptureRow,
  ScriptureTable,
  ScriptureText,
  ScriptureVerse,
} from '@sillsdev/lynx';
import isEqual from 'lodash.isequal';
import Delta from 'quill-delta';

import { DeltaDocument } from './delta-document';

export class ScriptureDeltaDocument extends DeltaDocument implements ScriptureDocument {
  private readonly _children: ScriptureNode[] = [];
  readonly type = ScriptureNodeType.Document;
  readonly document = this;
  readonly parent = undefined;
  readonly isLeaf = false;
  range: Range = { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };

  constructor(uri: string, version: number, content: Delta) {
    super(uri, 'scripture-delta', version, content);
    this._lineOffsets = [0];
    this._children.push(...processDelta(content, this._lineOffsets));
  }

  get children(): readonly ScriptureNode[] {
    return this._children;
  }

  updateParent(_parent: ScriptureNode | undefined): void {
    throw new Error('The method is not supported.');
  }

  remove(): void {
    throw new Error('The method is not supported.');
  }

  findNodes(
    filter?: ScriptureNodeType | ((node: ScriptureNode) => boolean) | ScriptureNodeType[],
  ): IterableIterator<ScriptureNode> {
    return findScriptureNodes(this, filter);
  }

  appendChild(child: ScriptureNode): void {
    this._children.push(child);
    child.updateParent(this);
  }

  insertChild(index: number, child: ScriptureNode): void {
    this._children.splice(index, 0, child);
    child.updateParent(this);
  }

  removeChild(child: ScriptureNode): void {
    if (child.parent !== this) {
      throw new Error('This node does not contain the specified child.');
    }
    const index = this._children.indexOf(child);
    if (index === -1) {
      throw new Error('This node does not contain the specified child.');
    }
    this._children.splice(index, 1);
    child.updateParent(undefined);
  }

  spliceChildren(start: number, deleteCount: number, ...items: ScriptureNode[]): void {
    const removed = this._children.splice(start, deleteCount, ...items);
    for (const child of removed) {
      child.updateParent(undefined);
    }
    for (const child of items) {
      child.updateParent(this);
    }
  }

  clearChildren(): void {
    this._children.length = 0;
  }
}

function processDelta(delta: Delta, lineOffsets: number[] = []): ScriptureNode[] {
  const content: ScriptureNode[] = [];
  let curCharAttrs: Record<string, unknown>[] = [];
  const childNodes: ScriptureNode[][] = [];
  childNodes.push([]);
  let curTableAttrs: Record<string, any> | undefined = undefined;
  let curRowAttrs: Record<string, any> | undefined = undefined;
  let line = 0;
  let character = 0;
  let offset = 0;
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
      let text = op.insert;
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
            getContainerRange(children),
          );
        } else {
          cellNode = childNodes[childNodes.length - 1][0] as ScriptureCell;
        }
        childNodes.pop();

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

        childNodes[childNodes.length - 2].push(cellNode);
        childNodes.push([]);

        curTableAttrs = tableAttrs;
        curRowAttrs = rowAttrs;
      }

      if (attrs == null) {
        if (text.length > 1 && text.endsWith('\n')) {
          const impliedParagraphs = text.split('\n').filter((t) => t.length > 0);
          const inlineText = impliedParagraphs.join('');
          childNodes[childNodes.length - 1].push(
            new ScriptureText(inlineText, {
              start: { line, character },
              end: { line, character: character + inlineText.length },
            }),
          );
          text = '\n';
        }

        if (text === '\n') {
          content.push(...childNodes[childNodes.length - 1]);
          childNodes[childNodes.length - 1].length = 0;
          line += 1;
          character = 0;
          lineOffsets.push(offset + length);
          continue;
        }

        childNodes[childNodes.length - 1].push(
          new ScriptureText(text, { start: { line, character }, end: { line, character: character + length } }),
        );
      } else {
        // text blots
        for (const [key, value] of Object.entries(attrs)) {
          const textBlotAttrs = value as Record<string, unknown>;
          switch (key) {
            case 'para':
              // end of a para block
              for (const _ of text) {
                const children = childNodes[childNodes.length - 1];
                content.push(
                  new ScriptureParagraph(
                    textBlotAttrs.style as string,
                    getNodeAttributes(textBlotAttrs),
                    children,
                    getContainerRange(children),
                  ),
                );
              }
              childNodes[childNodes.length - 1].length = 0;
              line += 1;
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
                end: { line, character: character + length },
              }),
            );
            line += 1;
            character = -1;
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
    if (character === -1) {
      character = 0;
      lineOffsets.push(offset);
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
