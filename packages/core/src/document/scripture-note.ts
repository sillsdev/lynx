import { ScriptureContainer } from './scripture-container';

export class ScriptureNote extends ScriptureContainer {
  constructor(
    public readonly style: string,
    public readonly caller: string,
    public readonly category?: string,
  ) {
    super();
  }
}
