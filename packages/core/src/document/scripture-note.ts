import { ScriptureContainer } from './scripture-container';
import { ScriptureNodeType } from './scripture-node';

export class ScriptureNote extends ScriptureContainer {
  constructor(
    public readonly style: string,
    public readonly caller: string,
    public readonly category?: string,
  ) {
    super();
  }

  get type(): ScriptureNodeType {
    return ScriptureNodeType.Note;
  }
}
