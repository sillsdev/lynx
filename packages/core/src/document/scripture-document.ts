import { Document } from './document';
import { ScriptureContainer } from './scripture-container';
import { ScriptureNode } from './scripture-node';

export class ScriptureDocument extends ScriptureContainer implements Document {
  constructor(
    public readonly uri: string,
    children?: ScriptureNode[],
  ) {
    super(children);
  }
}
