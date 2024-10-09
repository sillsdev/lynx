import { ScriptureContainer } from './scripture-container';
import { ScriptureNodeType } from './scripture-node';

export class ScriptureParagraph extends ScriptureContainer {
  constructor(
    public readonly style: string,
    public readonly attributes: Record<string, string> = {},
  ) {
    super();
  }

  get type(): ScriptureNodeType {
    return ScriptureNodeType.Paragraph;
  }
}
