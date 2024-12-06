export interface DocumentData<T = string> {
  format: string;
  version: number;
  content: T;
}

export interface DocumentReader<T = string> {
  keys(): string[];
  read(uri: string): Promise<DocumentData<T> | undefined>;
}
