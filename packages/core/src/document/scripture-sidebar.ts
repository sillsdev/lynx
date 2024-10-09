import { ScriptureContainer } from './scripture-container';

export class ScriptureSidebar extends ScriptureContainer {
  constructor(
    public readonly style: string,
    public readonly category?: string,
    children?: ScriptureContainer[],
  ) {
    super(children);
  }
}
