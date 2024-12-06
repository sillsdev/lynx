import { Document, DocumentAccessor, EditFactory, OnTypeFormattingProvider, Position, TextEdit } from '@sillsdev/lynx';

export class SimpleQuoteFormattingProvider<T = TextEdit> implements OnTypeFormattingProvider<T> {
  readonly id = 'simple-quote';
  readonly onTypeTriggerCharacters: ReadonlySet<string> = new Set(['"', '“', '”']);

  constructor(
    private readonly documents: DocumentAccessor,
    private readonly editFactory: EditFactory<Document, T>,
  ) {}

  init(): Promise<void> {
    return Promise.resolve();
  }

  async getOnTypeEdits(uri: string, _position: Position, _ch: string): Promise<T[] | undefined> {
    const doc = await this.documents.get(uri);
    if (doc == null) {
      return undefined;
    }

    const edits: T[] = [];
    const text = doc.getText();
    for (const match of text.matchAll(/["“”]/g)) {
      if ((match.index === 0 || text[match.index - 1].trim() === '') && match[0] !== '“') {
        edits.push(
          ...this.editFactory.createTextEdit(
            doc,
            { start: doc.positionAt(match.index), end: doc.positionAt(match.index + 1) },
            '“',
          ),
        );
      } else if ((match.index === text.length - 1 || text[match.index + 1].trim() === '') && match[0] !== '”') {
        edits.push(
          ...this.editFactory.createTextEdit(
            doc,
            { start: doc.positionAt(match.index), end: doc.positionAt(match.index + 1) },
            '”',
          ),
        );
      }
    }

    if (edits.length === 0) {
      return undefined;
    }
    return edits;
  }
}
