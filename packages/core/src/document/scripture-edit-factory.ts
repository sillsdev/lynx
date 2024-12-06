import { Range } from '../common/range';
import { TextEdit } from '../common/text-edit';
import { EditFactory } from './edit-factory';
import { ScriptureDocument, ScriptureNode } from './scripture-document';

export interface ScriptureEditFactory<TDoc extends ScriptureDocument = ScriptureDocument, TEdit = TextEdit>
  extends EditFactory<TDoc, TEdit> {
  createScriptureEdit(document: TDoc, range: Range, nodes: ScriptureNode[] | ScriptureNode): TEdit[];
}
