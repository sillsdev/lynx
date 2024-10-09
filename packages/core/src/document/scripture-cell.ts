import { ScriptureContainer } from './scripture-container';
import { ScriptureNodeType } from './scripture-node';

export class ScriptureCell extends ScriptureContainer {
  constructor(
    public readonly style: string,
    public readonly align: string,
    public readonly colSpan: number,
    children?: ScriptureContainer[],
  ) {
    super(children);
  }

  get type(): ScriptureNodeType {
    return ScriptureNodeType.Cell;
  }
}
