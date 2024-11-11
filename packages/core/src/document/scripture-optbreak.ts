import { ScriptureNodeType } from './scripture-document';
import { ScriptureLeaf } from './scripture-leaf';

export class ScriptureOptBreak extends ScriptureLeaf {
  readonly type = ScriptureNodeType.OptBreak;
}
