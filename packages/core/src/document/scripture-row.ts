import { ScriptureContainer } from './scripture-container';
import { ScriptureNodeType } from './scripture-node';

export class ScriptureRow extends ScriptureContainer {
  get type(): ScriptureNodeType {
    return ScriptureNodeType.Row;
  }
}
