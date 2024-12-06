import { Range } from '../common/range';
import { ScriptureContainer } from './scripture-container';
import { ScriptureNode, ScriptureNodeType } from './scripture-document';

export class ScriptureParagraph extends ScriptureContainer {
  readonly type = ScriptureNodeType.Paragraph;
  readonly attributes: Record<string, string>;

  constructor(
    public readonly style: string,
    attributes: Record<string, string> = {},
    children?: ScriptureNode[],
    range: Range = { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
  ) {
    super(children, range);
    this.attributes = attributes;
  }
}
