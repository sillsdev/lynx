import { Range } from '../common/range';
import { ScriptureContainer } from './scripture-container';
import { ScriptureNode, ScriptureNodeType } from './scripture-document';

export class ScriptureCell extends ScriptureContainer {
  constructor(
    public readonly style: string,
    public readonly align: string,
    public readonly colSpan: number,
    children?: ScriptureNode[],
    range: Range = { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
  ) {
    super(children, range);
  }

  get type(): ScriptureNodeType {
    return ScriptureNodeType.Cell;
  }
}
