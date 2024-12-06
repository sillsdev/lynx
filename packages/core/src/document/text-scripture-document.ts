import { Position, Range } from '../common';
import { ScriptureDocument, ScriptureNode } from './scripture-document';
import { ScriptureSerializer } from './scripture-serializer';
import { TextDocument } from './text-document';
import { TextDocumentEdit } from './text-document-edit';

export class TextScriptureDocument extends ScriptureDocument {
  protected text: TextDocument;

  constructor(
    uri: string,
    format: string,
    version: number,
    content: string,
    protected readonly serializer: ScriptureSerializer,
    children?: ScriptureNode[],
  ) {
    super(uri, children);
    this.text = new TextDocument(uri, format, version, content);
  }

  get content(): string {
    return this.text.content;
  }

  get version(): number {
    return this.text.version;
  }

  set version(version: number) {
    this.text.version = version;
  }

  getText(range?: Range): string {
    return this.text.getText(range);
  }

  offsetAt(position: Position): number {
    return this.text.offsetAt(position);
  }

  positionAt(offset: number, range?: Range): Position {
    return this.text.positionAt(offset, range);
  }

  createTextEdit(startOffset: number, endOffset: number, newText: string): TextDocumentEdit[] {
    return this.text.createTextEdit(startOffset, endOffset, newText);
  }

  createScriptureEdit(
    startOffset: number,
    endOffset: number,
    nodes: ScriptureNode[] | ScriptureNode,
  ): TextDocumentEdit[] {
    return this.text.createTextEdit(startOffset, endOffset, this.serializer.serialize(nodes));
  }
}
