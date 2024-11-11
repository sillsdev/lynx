import { ScriptureContainer } from './scripture-container';
import { ScriptureNode, ScriptureNodeType } from './scripture-document';

export class ScriptureCharacterStyle extends ScriptureContainer {
  constructor(
    public readonly style: string,
    public readonly attributes: Record<string, string> = {},
    children?: ScriptureNode[],
  ) {
    super(children);
  }

  get type(): ScriptureNodeType {
    return ScriptureNodeType.CharacterStyle;
  }
}
