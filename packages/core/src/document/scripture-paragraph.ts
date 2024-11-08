import { ScriptureContainer } from './scripture-container';
import { ScriptureNode, ScriptureNodeType } from './scripture-node';

export class ScriptureParagraph extends ScriptureContainer {
  readonly type = ScriptureNodeType.Paragraph;
  readonly attributes: Record<string, string>;

  constructor(style: string, children?: ScriptureNode[]);
  constructor(style: string, attributes?: Record<string, string>, children?: ScriptureNode[]);
  constructor(
    public readonly style: string,
    attributesOrChildren: Record<string, string> | ScriptureNode[] = {},
    children?: ScriptureNode[],
  ) {
    if (Array.isArray(attributesOrChildren)) {
      children = attributesOrChildren;
      attributesOrChildren = {};
    }
    super(children);
    this.attributes = attributesOrChildren;
  }
}
