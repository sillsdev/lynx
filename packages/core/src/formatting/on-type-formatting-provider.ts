import { Position } from '../common/position';

export interface OnTypeFormattingProvider {
  readonly id: string;

  readonly onTypeTriggerCharacters: ReadonlySet<string>;

  init(): Promise<void>;
  getOnTypeEdits(uri: string, position: Position, ch: string): Promise<unknown[] | undefined>;
}
