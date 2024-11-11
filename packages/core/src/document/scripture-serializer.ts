import { ScriptureNode } from './scripture-document';

export interface ScriptureSerializer {
  serialize(nodes: ScriptureNode[] | ScriptureNode): string;
}
