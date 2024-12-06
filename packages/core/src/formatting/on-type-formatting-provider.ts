import { Position } from '../common/position';
import { TextEdit } from '../common/text-edit';

export interface OnTypeFormattingProvider<T = TextEdit> {
  readonly id: string;

  readonly onTypeTriggerCharacters: ReadonlySet<string>;

  init(): Promise<void>;
  getOnTypeEdits(uri: string, position: Position, ch: string): Promise<T[] | undefined>;
}
