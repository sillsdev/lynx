import { Range, ScriptureNode, ScriptureTextEditFactory, TextEdit } from '@sillsdev/lynx';
import { UsfmStylesheet } from '@sillsdev/machine';

import { UsfmDocument } from './usfm-document';
import { UsfmScriptureSerializer } from './usfm-scripture-serializer';

export class UsfmEditFactory extends ScriptureTextEditFactory<UsfmDocument> {
  private readonly serializer: UsfmScriptureSerializer;

  constructor(stylesheet: UsfmStylesheet) {
    super();
    this.serializer = new UsfmScriptureSerializer(stylesheet);
  }

  createScriptureEdit(document: UsfmDocument, range: Range, nodes: ScriptureNode[] | ScriptureNode): TextEdit[] {
    return this.createTextEdit(document, range, this.serializer.serialize(nodes));
  }
}
