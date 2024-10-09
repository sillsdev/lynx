import { Document } from './document';
import { ScriptureContainer } from './scripture-container';
import { ScriptureNode } from './scripture-node';

export class ScriptureDocument extends ScriptureContainer implements Document {
  public readonly lineOffsets: number[] = [];

  constructor(
    public readonly uri: string,
    public readonly format: string,
    public version: number,
    public content: string,
    children?: ScriptureNode[],
  ) {
    super(children);
  }
}
