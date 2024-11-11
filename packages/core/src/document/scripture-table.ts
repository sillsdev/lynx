import { ScriptureContainer } from './scripture-container';
import { ScriptureNodeType } from './scripture-document';

export class ScriptureTable extends ScriptureContainer {
  get type(): ScriptureNodeType {
    return ScriptureNodeType.Table;
  }
}
