import { Position, ZERO_POSITION } from './position';

export const ZERO_RANGE: Range = { start: ZERO_POSITION, end: ZERO_POSITION };

export interface Range {
  start: Position;
  end: Position;
}
