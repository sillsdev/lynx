import { Position } from '../common/position';
import { TextEdit } from '../common/text-edit';
import { Document } from '../document/document';
import { DocumentManager } from '../document/document-manager';

export type OnTypeFormattingProviderFactory<T extends Document = Document> = (
  DocumentManager: DocumentManager<T>,
) => OnTypeFormattingProvider;
export type OnTypeFormattingProviderConstructor<T extends Document = Document> = new (
  documentManager: DocumentManager<T>,
) => OnTypeFormattingProvider;

export interface OnTypeFormattingProvider {
  readonly id: string;

  readonly onTypeTriggerCharacters: ReadonlySet<string>;

  getOnTypeEdits(uri: string, position: Position, ch: string): Promise<TextEdit[] | undefined>;
}
