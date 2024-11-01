import { Range } from '../common/range';
import { ScriptureLeaf } from './scripture-leaf';
import { ScriptureNodeType } from './scripture-node';

export class ScriptureText extends ScriptureLeaf {
  constructor(
    public readonly text: string,
    range?: Range,
  ) {
    super(range);
  }

  get type(): ScriptureNodeType {
    return ScriptureNodeType.Text;
  }

  getText(): string {
    return this.text;
  }
}
