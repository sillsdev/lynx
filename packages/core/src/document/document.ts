import { Position } from '../common/position';

export interface Document {
  readonly uri: string;
  readonly version: number;
  readonly format: string;

  getText(): string;
  positionAt(offset: number): Position;
}
