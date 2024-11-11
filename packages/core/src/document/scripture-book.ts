import { ScriptureContainer } from './scripture-container';
import { ScriptureNodeType } from './scripture-document';

export class ScriptureBook extends ScriptureContainer {
  public readonly style = 'id';

  constructor(public readonly code: string) {
    super();
  }

  get type(): ScriptureNodeType {
    return ScriptureNodeType.Book;
  }
}
