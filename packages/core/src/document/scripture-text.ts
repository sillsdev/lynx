import { Range } from '../common/range';
import { ScriptureNode, ScriptureNodeType } from './scripture-node';

export class ScriptureText extends ScriptureNode {
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
