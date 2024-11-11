import { Range } from '../common/range';
import { ScriptureNodeType } from './scripture-document';
import { ScriptureMilestone } from './scripture-milestone';

export class ScriptureVerse extends ScriptureMilestone {
  readonly altNumber?: string;

  constructor(number: string, altNumber?: string, pubNumber?: string, sid?: string, eid?: string, range?: Range);
  constructor(number: string, range?: Range);
  constructor(
    public readonly number: string,
    altNumberOrRange?: string | Range,
    public readonly pubNumber?: string,
    sid?: string,
    eid?: string,
    range?: Range,
  ) {
    if (typeof altNumberOrRange === 'object') {
      range = altNumberOrRange;
      altNumberOrRange = undefined;
    }
    super('v', true, sid, eid, undefined, range);
    this.altNumber = altNumberOrRange;
  }

  get type(): ScriptureNodeType {
    return ScriptureNodeType.Verse;
  }
}
