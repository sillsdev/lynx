import { Range } from '../common/range';
import { ScriptureMilestone } from './scripture-milestone';
import { ScriptureNodeType } from './scripture-node';

export class ScriptureVerse extends ScriptureMilestone {
  constructor(
    public readonly number: string,
    public readonly altNumber?: string,
    public readonly pubNumber?: string,
    public readonly sid?: string,
    public readonly eid?: string,
    range?: Range,
  ) {
    super('v', sid, eid, undefined, range);
  }

  get type(): ScriptureNodeType {
    return ScriptureNodeType.Verse;
  }
}
