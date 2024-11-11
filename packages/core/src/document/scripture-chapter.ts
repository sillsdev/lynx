import { Range } from '../common/range';
import { ScriptureNodeType } from './scripture-document';
import { ScriptureMilestone } from './scripture-milestone';

export class ScriptureChapter extends ScriptureMilestone {
  constructor(
    public readonly number: string,
    public readonly altNumber?: string,
    public readonly pubNumber?: string,
    sid?: string,
    eid?: string,
    range?: Range,
  ) {
    super('c', true, sid, eid, undefined, range);
  }

  get type(): ScriptureNodeType {
    return ScriptureNodeType.Chapter;
  }
}
