import { Range } from '../common/range';
import { ScriptureNodeType } from './scripture-document';
import { ScriptureLeaf } from './scripture-leaf';

export class ScriptureMilestone extends ScriptureLeaf {
  constructor(
    public readonly style: string,
    public readonly isStart: boolean,
    public readonly sid?: string,
    public readonly eid?: string,
    public readonly attributes: Record<string, string> = {},
    range?: Range,
  ) {
    super(range);
  }

  get type(): ScriptureNodeType {
    return ScriptureNodeType.Milestone;
  }
}
