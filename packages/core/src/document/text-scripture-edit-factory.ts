import { TextEdit } from '../common';
import { ScriptureDocument, ScriptureNode } from './scripture-document';
import { ScriptureEditFactory } from './scripture-edit-factory';
import { TextScriptureDocument } from './text-scripture-document';

export abstract class TextScriptureEditFactory<T extends TextScriptureDocument> implements ScriptureEditFactory<T> {
  createTextEdit(document: T, startOffset: number, endOffset: number, newText: string): TextEdit[] {
    return [{ range: { start: document.positionAt(startOffset), end: document.positionAt(endOffset) }, newText }];
  }

  abstract createScriptureEdit(
    document: ScriptureDocument,
    startOffset: number,
    endOffset: number,
    nodes: ScriptureNode[] | ScriptureNode,
  ): TextEdit[];
}
