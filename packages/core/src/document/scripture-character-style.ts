import { ScriptureContainer } from './scripture-container';

export class ScriptureCharacterStyle extends ScriptureContainer {
  constructor(
    public readonly style: string,
    public readonly attributes: Record<string, string> = {},
  ) {
    super();
  }
}
