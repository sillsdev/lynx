import { Range, ZERO_RANGE } from '../common/range';
import { ScriptureContainer } from './scripture-container';

export abstract class ScriptureNode {
  private _parent?: ScriptureContainer;

  constructor(public range: Range = ZERO_RANGE) {}

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
}
