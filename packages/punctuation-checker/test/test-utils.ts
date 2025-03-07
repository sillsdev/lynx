import { DocumentManager, Position, Range, ScriptureDocument, TextDocument } from '@sillsdev/lynx';
import { UsfmDocumentFactory } from '@sillsdev/lynx-usfm';

// Just returns a document with the text of the URI
// (allows for much more concise testing, since we avoid creating
// a document and then referring to when we ask for Diagnostics)
export class StubTextDocumentManager extends DocumentManager<TextDocument> {
  get(text: string): Promise<TextDocument | undefined> {
    return new Promise<TextDocument>((resolve) => {
      resolve(new StubSingleLineTextDocument(text));
    });
  }
}
export class StubScriptureDocumentManager extends DocumentManager<ScriptureDocument> {
  constructor(private readonly usfmDocumentFactory: UsfmDocumentFactory) {
    super(usfmDocumentFactory);
  }

  get(text: string): Promise<ScriptureDocument | undefined> {
    return new Promise<ScriptureDocument>((resolve) => {
      resolve(this.usfmDocumentFactory.create('test', { format: 'usfm', version: 1, content: text }));
    });
  }
}

export class StubSingleLineTextDocument extends TextDocument {
  public constructor(private readonly text: string) {
    super('test', 'no-format', 1, text);
  }

  public getText(_range?: Range): string {
    return this.text;
  }

  public positionAt(offset: number): Position {
    return {
      line: 0,
      character: offset,
    };
  }

  public offsetAt(position: Position): number {
    return position.character;
  }
}

export class StubFixedLineWidthTextDocument extends TextDocument {
  private lineWidth = 1000;
  public constructor(private readonly text: string) {
    super('test', 'no-format', 1, text);
  }

  public getText(_range: Range): string {
    return this.text;
  }

  public positionAt(offset: number, enclosingRange?: Range): Position {
    const newOffset = offset + (enclosingRange === undefined ? 0 : this.offsetAt(enclosingRange.start));
    return {
      line: Math.floor(newOffset / this.lineWidth),
      character: newOffset % this.lineWidth,
    };
  }

  public offsetAt(position: Position): number {
    return position.line * this.lineWidth + position.character;
  }
}
