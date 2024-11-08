import { DocumentManager, OnTypeFormattingProvider, Position, TextDocument, TextEdit } from '@sillsdev/lynx';

export class SimpleQuoteFormattingProvider implements OnTypeFormattingProvider {
  readonly id = 'simple-quote';
  readonly onTypeTriggerCharacters: ReadonlySet<string> = new Set(['"', '“', '”']);

  constructor(private readonly documentManager: DocumentManager<TextDocument>) {}

  init(): Promise<void> {
    return Promise.resolve();
  }

  async getOnTypeEdits(uri: string, _position: Position, _ch: string): Promise<TextEdit[] | undefined> {
    const doc = await this.documentManager.get(uri);
    if (doc == null) {
      return undefined;
    }

    const edits: TextEdit[] = [];
    const text = doc.getText();
    for (const match of text.matchAll(/["“”]/g)) {
      if ((match.index === 0 || text[match.index - 1].trim() === '') && match[0] !== '“') {
        const pos = doc.positionAt(match.index);
        edits.push({ range: { start: pos, end: { line: pos.line, character: pos.character + 1 } }, newText: '“' });
      } else if ((match.index === text.length - 1 || text[match.index + 1].trim() === '') && match[0] !== '”') {
        const pos = doc.positionAt(match.index);
        edits.push({ range: { start: pos, end: { line: pos.line, character: pos.character + 1 } }, newText: '”' });
      }
    }

    if (edits.length === 0) {
      return undefined;
    }
    return edits;
  }
}
