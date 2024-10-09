import { ScriptureContainer } from './scripture-container';

export class ScriptureParagraph extends ScriptureContainer {
  constructor(
    public readonly style: string,
    public readonly attributes: Record<string, string> = {},
  ) {
    super();
  }
}
