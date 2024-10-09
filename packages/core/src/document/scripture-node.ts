import { Range } from '../common/range';
import { ScriptureContainer } from './scripture-container';
import { ScriptureDocument } from './scripture-document';

export abstract class ScriptureNode {
  private _parent?: ScriptureContainer;

  constructor(public range: Range = { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }) {}

  get document(): ScriptureDocument | undefined {
    return this._parent?.document;
  }

  get parent(): ScriptureContainer | undefined {
    return this._parent;
  }

  updateParent(parent: ScriptureContainer | undefined): void {
    this._parent = parent;
  }

  remove(): void {
    if (this._parent == null) {
      throw new Error('The node does not have a parent.');
    }
    this._parent.removeChild(this);
  }

  getText(): string {
    if (this.document == null) {
      throw new Error('The node is not part of a document.');
    }
    return this.document.getText(this.range);
  }
}
