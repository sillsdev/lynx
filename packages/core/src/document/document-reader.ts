export interface DocumentData {
  format: string;
  version: number;
  content: string;
}

export interface DocumentReader {
  keys(): string[];
  read(uri: string): DocumentData | undefined;
}
