import { Observable } from 'rxjs';

import { Document } from './document';

export interface DocumentCreated<T extends Document> {
  document: T;
}

export interface DocumentClosed {
  uri: string;
}

export interface DocumentOpened<T extends Document> {
  document: T;
}

export interface DocumentDeleted {
  uri: string;
}

export interface DocumentChanged<T extends Document> {
  document: T;
}

export interface DocumentAccessor<T extends Document = Document> {
  readonly created$: Observable<DocumentCreated<T>>;
  readonly closed$: Observable<DocumentClosed>;
  readonly opened$: Observable<DocumentOpened<T>>;
  readonly deleted$: Observable<DocumentDeleted>;
  readonly changed$: Observable<DocumentChanged<T>>;

  get(uri: string): Promise<T | undefined>;
  all(): Promise<T[]>;
  active(): Promise<T[]>;
}
