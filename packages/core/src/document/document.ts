import { Position } from '../common/position';
import { TextDocumentChange } from './text-document-change';

export interface Document {
  readonly uri: string;
  readonly version: number;
  readonly format: string;

  getText(): string;
  positionAt(offset: number): Position;
}

export interface DocumentData<T = string> {
  format: string;
  version: number;
  content: T;
}

export interface DocumentChanges<T = TextDocumentChange> {
  version: number;
  contentChanges: T[];
}
