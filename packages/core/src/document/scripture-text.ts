import { Range } from '../common/range';
import { ScriptureNodeType } from './scripture-document';
import { ScriptureLeaf } from './scripture-leaf';

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
