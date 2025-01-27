import { DocumentData } from './document';

export interface DocumentReader<T = string> {
  keys(): string[];
  read(uri: string): Promise<DocumentData<T> | undefined>;
}
