import {
  Position,
  Range,
  ScriptureChapter,
  ScriptureDocument,
  ScriptureNode,
  ScriptureParagraph,
  ScriptureText,
  ScriptureVerse,
} from '@sillsdev/lynx';
import Delta from 'quill-delta';

import { DeltaDocument } from './delta-document';

export class DeltaScriptureDocument extends ScriptureDocument {
  private readonly deltaDoc: DeltaDocument;

  constructor(uri: string, version: number, content: Delta) {
    super(uri);
    this.deltaDoc = new DeltaDocument(uri, 'scripture-delta', version, content);
    this.parseDelta(content);
  }

  get version(): number {
    return this.deltaDoc.version;
  }

  set version(version: number) {
    this.deltaDoc.version = version;
  }

  get format(): string {
    return this.deltaDoc.format;
  }

  get content(): Delta {
    return this.deltaDoc.content;
  }

  getText(range?: Range): string {
    return this.deltaDoc.getText(range);
  }

  offsetAt(position: Position): number {
    return this.deltaDoc.offsetAt(position);
  }

  positionAt(offset: number, range?: Range): Position {
    return this.deltaDoc.positionAt(offset, range);
  }

  private parseDelta(content: Delta): void {
    this.clearChildren();
    content.eachLine((line, attributes) => {
      const children: ScriptureNode[] = [];
      line.forEach((op) => {
        if (typeof op.insert === 'string') {
          children.push(new ScriptureText(op.insert));
        } else if (op.insert != null) {
          // embeds
          for (const [key, value] of Object.entries(op.insert)) {
            const attrs = value as any;
            switch (key) {
              case 'chapter':
                this.appendChild(new ScriptureChapter(attrs.number));
                break;

              case 'verse':
                children.push(new ScriptureVerse(attrs.number));
                break;
            }
          }
        }
      });
      for (const [key, value] of Object.entries(attributes)) {
        const attrs = value as any;
        switch (key) {
          case 'para':
            this.appendChild(new ScriptureParagraph(attrs.style, children));
            break;
        }
      }
    });
  }
}
