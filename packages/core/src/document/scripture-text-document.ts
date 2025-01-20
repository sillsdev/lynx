import { ScriptureDocumentMixin, ScriptureNode } from './scripture-document';
import { TextDocument } from './text-document';

export class ScriptureTextDocument extends ScriptureDocumentMixin(TextDocument) {
  constructor(uri: string, format: string, version: number, content: string, children?: ScriptureNode[]) {
    super(uri, format, version, content);
    if (children != null) {
      for (const child of children) {
        this.appendChild(child);
      }
    }
  }
}
