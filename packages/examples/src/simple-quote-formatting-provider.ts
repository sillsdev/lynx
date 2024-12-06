import { DocumentManager, OnTypeFormattingProvider, Position } from '@sillsdev/lynx';

export class SimpleQuoteFormattingProvider implements OnTypeFormattingProvider {
  readonly id = 'simple-quote';
  readonly onTypeTriggerCharacters: ReadonlySet<string> = new Set(['"', '“', '”']);

  constructor(private readonly documentManager: DocumentManager) {}

  init(): Promise<void> {
    return Promise.resolve();
  }

  async getOnTypeEdits(uri: string, _position: Position, _ch: string): Promise<unknown[] | undefined> {
    const doc = await this.documentManager.get(uri);
    if (doc == null) {
      return undefined;
    }

    const edits: unknown[] = [];
    const text = doc.getText();
    for (const match of text.matchAll(/["“”]/g)) {
      if ((match.index === 0 || text[match.index - 1].trim() === '') && match[0] !== '“') {
        edits.push(...doc.createTextEdit(match.index, match.index + 1, '“'));
      } else if ((match.index === text.length - 1 || text[match.index + 1].trim() === '') && match[0] !== '”') {
        edits.push(...doc.createTextEdit(match.index, match.index + 1, '”'));
      }
    }

    if (edits.length === 0) {
      return undefined;
    }
    return edits;
  }
}
