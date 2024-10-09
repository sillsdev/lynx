import { Range } from '../common/range';
import { ScriptureNode } from './scripture-node';

export class ScriptureText extends ScriptureNode {
  constructor(
    public readonly text: string,
    range?: Range,
  ) {
    super(range);
  }

  getText(): string {
    return this.text;
  }
}
