import { Range } from '../common/range';
import { Document } from './document';
import { ScriptureContainer } from './scripture-container';
import { ScriptureNode } from './scripture-node';

export abstract class ScriptureDocument extends ScriptureContainer implements Document {
  constructor(
    public readonly uri: string,
    children?: ScriptureNode[],
  ) {
    super(children);
  }

  get document(): this | undefined {
    return this;
  }

  abstract getText(range?: Range): string;
}
