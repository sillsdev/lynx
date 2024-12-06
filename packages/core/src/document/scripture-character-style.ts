import { Range } from '../common/range';
import { ScriptureContainer } from './scripture-container';
import { ScriptureNode, ScriptureNodeType } from './scripture-document';

export class ScriptureCharacterStyle extends ScriptureContainer {
  constructor(
    public readonly style: string,
    public readonly attributes: Record<string, string> = {},
    children?: ScriptureNode[],
    range: Range = { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
  ) {
    super(children, range);
  }

  get type(): ScriptureNodeType {
    return ScriptureNodeType.CharacterStyle;
  }
}
