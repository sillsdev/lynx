import { ScriptureContainer } from './scripture-container';
import { ScriptureNodeType } from './scripture-node';

export class ScriptureSidebar extends ScriptureContainer {
  constructor(
    public readonly style: string,
    public readonly category?: string,
    children?: ScriptureContainer[],
  ) {
    super(children);
  }

  get type(): ScriptureNodeType {
    return ScriptureNodeType.Sidebar;
  }
}
