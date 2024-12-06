import { Position, Range } from '../common';
import { ScriptureDocument, ScriptureNode } from './scripture-document';
import { TextDocument } from './text-document';

export class TextScriptureDocument extends ScriptureDocument {
  protected text: TextDocument;

  constructor(uri: string, format: string, version: number, content: string, children?: ScriptureNode[]) {
    super(uri, children);
    this.text = new TextDocument(uri, format, version, content);
  }

  get version(): number {
    return this.text.version;
  }

  set version(version: number) {
    this.text.version = version;
  }

  get format(): string {
    return this.text.format;
  }

  get content(): string {
    return this.text.content;
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
}
