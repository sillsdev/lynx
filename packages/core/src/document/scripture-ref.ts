import { Range } from '../common/range';
import { ScriptureNodeType } from './scripture-document';
import { ScriptureLeaf } from './scripture-leaf';

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
