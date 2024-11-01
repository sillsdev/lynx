import { ScriptureContainer } from './scripture-container';
import { ScriptureNodeType } from './scripture-node';

export class ScriptureParagraph extends ScriptureContainer {
  readonly type = ScriptureNodeType.Paragraph;

  constructor(
    public readonly style: string,
    public readonly attributes: Record<string, string> = {},
  ) {
    super();
  }
}
