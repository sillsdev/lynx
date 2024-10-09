import { ScriptureContainer } from './scripture-container';

export class ScriptureBook extends ScriptureContainer {
  constructor(public readonly code: string) {
    super();
  }
}
