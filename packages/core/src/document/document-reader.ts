import { DocumentData } from './document';

export interface DocumentReader<T = string> {
  keys(): Promise<string[]>;
  read(uri: string): Promise<DocumentData<T> | undefined>;
}
