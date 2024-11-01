import { Range } from '../common/range';
import { ScriptureLeaf } from './scripture-leaf';
import { ScriptureNodeType } from './scripture-node';

export class ScriptureRef extends ScriptureLeaf {
  constructor(
    public readonly display: string,
    public readonly target: string,
    range?: Range,
  ) {
    super(range);
  }

  get type(): ScriptureNodeType {
    return ScriptureNodeType.Ref;
  }
}
