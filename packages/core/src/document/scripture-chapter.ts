import { Range } from '../common/range';
import { ScriptureMilestone } from './scripture-milestone';
import { ScriptureNodeType } from './scripture-node';

export class ScriptureChapter extends ScriptureMilestone {
  constructor(
    public readonly number: string,
    public readonly altNumber?: string,
    public readonly pubNumber?: string,
    public readonly sid?: string,
    public readonly eid?: string,
    range?: Range,
  ) {
    super('c', sid, eid, undefined, range);
  }

  get type(): ScriptureNodeType {
    return ScriptureNodeType.Chapter;
  }
}
