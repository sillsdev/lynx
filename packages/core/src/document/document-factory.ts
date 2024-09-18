import { Range } from '../common/range';
import { Document } from './document';

export interface DocumentChange {
  range?: Range;
  text: string;
}

export interface DocumentFactory<T extends Document> {
  create(uri: string, format: string, version: number, content: string): T;
  update(document: T, changes: readonly DocumentChange[], version: number): T;
}
