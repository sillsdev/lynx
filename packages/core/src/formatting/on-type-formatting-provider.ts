import { Position } from '../common/position';
import { TextEdit } from '../common/text-edit';

export interface OnTypeFormattingProvider {
  readonly id: string;

  readonly onTypeTriggerCharacters: ReadonlySet<string>;

  getOnTypeEdits(uri: string, position: Position, ch: string): Promise<TextEdit[] | undefined>;
}
