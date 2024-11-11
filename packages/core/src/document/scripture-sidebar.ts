import { ScriptureContainer } from './scripture-container';
import { ScriptureNodeType } from './scripture-document';

export class ScriptureSidebar extends ScriptureContainer {
  public readonly style = 'esb';

  constructor(
    public readonly category?: string,
    children?: ScriptureContainer[],
  ) {
    super(children);
  }

  get type(): ScriptureNodeType {
    return ScriptureNodeType.Sidebar;
  }
}
