import { ScriptureNode, ScriptureNodeType } from './scripture-node';

export class ScriptureOptBreak extends ScriptureNode {
  get type(): ScriptureNodeType {
    return ScriptureNodeType.OptBreak;
  }
}
