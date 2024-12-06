import { TextEdit } from '../common';
import { Range } from '../common/range';
import { ScriptureDocument, ScriptureNode } from './scripture-document';
import { ScriptureEditFactory } from './scripture-edit-factory';
import { ScriptureTextDocument } from './scripture-text-document';
import { TextEditFactory } from './text-edit-factory';

export abstract class ScriptureTextEditFactory<T extends ScriptureTextDocument>
  extends TextEditFactory<T>
  implements ScriptureEditFactory<T>
{
  abstract createScriptureEdit(
    document: ScriptureDocument,
    range: Range,
    nodes: ScriptureNode[] | ScriptureNode,
  ): TextEdit[];
}
