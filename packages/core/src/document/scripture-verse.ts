import { Range } from '../common/range';
import { ScriptureMilestone } from './scripture-milestone';

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
}
