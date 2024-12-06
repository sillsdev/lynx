import { Document } from './document';

export interface DocumentFactory<T extends Document = Document> {
  create(uri: string, format: string, version: number, content: unknown): T;
  update(document: T, changes: readonly unknown[], version: number): T;
}
