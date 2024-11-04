import { ScriptureNode } from './scripture-node';

export interface ScriptureSerializer {
  serialize(nodes: ScriptureNode[] | ScriptureNode): string;
}
