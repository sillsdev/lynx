import { ScriptureContainer } from './scripture-container';

export class ScriptureCell extends ScriptureContainer {
  constructor(
    public readonly style: string,
    public readonly align: string,
    public readonly colSpan: number,
    children?: ScriptureContainer[],
  ) {
    super(children);
  }
}
