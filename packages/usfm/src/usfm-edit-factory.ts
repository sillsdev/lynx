import { ScriptureNode, TextEdit, TextScriptureEditFactory } from '@sillsdev/lynx';
import { UsfmStylesheet } from '@sillsdev/machine';

import { UsfmDocument } from './usfm-document';
import { UsfmScriptureSerializer } from './usfm-scripture-serializer';

export class UsfmEditFactory extends TextScriptureEditFactory<UsfmDocument> {
  private readonly serializer: UsfmScriptureSerializer;

  constructor(stylesheet: UsfmStylesheet) {
    super();
    this.serializer = new UsfmScriptureSerializer(stylesheet);
  }

  createScriptureEdit(
    document: UsfmDocument,
    startOffset: number,
    endOffset: number,
    nodes: ScriptureNode[] | ScriptureNode,
  ): TextEdit[] {
    return this.createTextEdit(document, startOffset, endOffset, this.serializer.serialize(nodes));
  }
}
