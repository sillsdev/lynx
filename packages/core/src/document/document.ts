export interface Document {
  readonly uri: string;
  readonly version: number;

  getText(): string;
  createTextEdit(startOffset: number, endOffset: number, newText: string): unknown[];
}
