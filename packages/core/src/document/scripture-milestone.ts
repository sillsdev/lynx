import { Range } from '../common/range';
import { ScriptureNode, ScriptureNodeType } from './scripture-node';

export class ScriptureMilestone extends ScriptureNode {
  constructor(
    public readonly style: string,
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
