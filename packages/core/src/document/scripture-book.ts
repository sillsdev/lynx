import { ScriptureContainer } from './scripture-container';
import { ScriptureNodeType } from './scripture-node';

export class ScriptureBook extends ScriptureContainer {
  constructor(public readonly code: string) {
    super();
  }

  get type(): ScriptureNodeType {
    return ScriptureNodeType.Book;
  }
}
