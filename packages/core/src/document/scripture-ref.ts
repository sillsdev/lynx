import { Range } from '../common/range';
import { ScriptureNode } from './scripture-node';

export class ScriptureRef extends ScriptureNode {
  constructor(
    public readonly display: string,
    public readonly target: string,
    range?: Range,
  ) {
    super(range);
  }
}
