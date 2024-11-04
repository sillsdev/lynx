import { Range } from '../common/range';
import { ScriptureMilestone } from './scripture-milestone';
import { ScriptureNodeType } from './scripture-node';

export class ScriptureVerse extends ScriptureMilestone {
  constructor(
    public readonly number: string,
    public readonly altNumber?: string,
    public readonly pubNumber?: string,
    sid?: string,
    eid?: string,
    range?: Range,
  ) {
    super('v', true, sid, eid, undefined, range);
  }

  get type(): ScriptureNodeType {
    return ScriptureNodeType.Verse;
  }
}
