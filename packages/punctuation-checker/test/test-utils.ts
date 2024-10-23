import { TextDocument, Range, Position, DocumentManager } from '@sillsdev/lynx';

// Just returns a document with the text of the URI
// (allows for much more concise testing, since we avoid creating
// a document and then referring to when we ask for Diagnostics)
export class StubDocumentManager extends DocumentManager<TextDocument> {
  get(text: string): Promise<TextDocument | undefined> {
    return new Promise<TextDocument>((resolve) => {
      resolve(new StubSingleLineTextDocument(text));
    });
  }
}

export class StubSingleLineTextDocument extends TextDocument {
  public constructor(private readonly text: string) {
    super('test', 1, text);
  }

  public getText(range?: Range): string {
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
