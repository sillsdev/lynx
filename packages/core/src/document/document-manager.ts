import { Observable, Subject } from 'rxjs';

import { Document } from './document';
import { DocumentChange, DocumentFactory } from './document-factory';
import { DocumentReader } from './document-reader';

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

export class DocumentManager<T extends Document> {
  private readonly documents = new Map<string, T>();
  private readonly activeDocuments = new Set<string>();
  private readonly createdSubject = new Subject<DocumentCreated<T>>();
  private readonly closedSubject = new Subject<DocumentClosed>();
  private readonly openedSubject = new Subject<DocumentOpened<T>>();
  private readonly deletedSubject = new Subject<DocumentDeleted>();
  private readonly changedSubject = new Subject<DocumentChanged<T>>();

  constructor(
    private readonly reader: DocumentReader | undefined,
    private readonly factory: DocumentFactory<T>,
  ) {}

  get created$(): Observable<DocumentCreated<T>> {
    return this.createdSubject.asObservable();
  }

  get closed$(): Observable<DocumentClosed> {
    return this.closedSubject.asObservable();
  }

  get opened$(): Observable<DocumentOpened<T>> {
    return this.openedSubject.asObservable();
  }

  get deleted$(): Observable<DocumentDeleted> {
    return this.deletedSubject.asObservable();
  }

  get changed$(): Observable<DocumentChanged<T>> {
    return this.changedSubject.asObservable();
  }

  get(uri: string): T | undefined {
    let doc = this.documents.get(uri);
    if (doc == null) {
      doc = this.reload(uri);
    }
    return doc;
  }

  all(): T[] {
    const docs = Array.from(this.documents.values());
    if (this.reader != null) {
      for (const id of this.reader.keys()) {
        if (this.documents.has(id)) continue;
        const doc = this.get(id);
        if (doc != null) {
          docs.push(doc);
        }
      }
    }
    return docs;
  }

  active(): T[] {
    return Array.from(this.activeDocuments)
      .map((uri) => this.get(uri))
      .filter((doc) => doc != null);
  }

  fireCreated(uri: string): void {
    const doc = this.get(uri);
    if (doc != null) {
      this.createdSubject.next({ document: doc });
    }
  }

  fireClosed(uri: string): void {
    this.documents.delete(uri);
    this.activeDocuments.delete(uri);
    this.closedSubject.next({ uri: uri });
  }

  fireOpened(uri: string, format: string, version: number, content: string): void {
    const doc = this.factory.create(uri, format, version, content);
    this.documents.set(uri, doc);
    this.activeDocuments.add(uri);
    this.openedSubject.next({ document: doc });
  }

  fireDeleted(uri: string): void {
    this.documents.delete(uri);
    this.deletedSubject.next({ uri: uri });
  }

  fireChanged(uri: string, changes?: readonly DocumentChange[], version?: number): void {
    let doc: T | undefined = undefined;
    if (changes == null) {
      doc = this.reload(uri);
    } else {
      doc = this.get(uri);
      if (doc != null) {
        doc = this.factory.update(doc, changes, version ?? 0);
        this.documents.set(uri, doc);
      }
    }
    if (doc != null) {
      this.changedSubject.next({ document: doc });
    }
  }

  private reload(uri: string): T | undefined {
    const data = this.reader?.read(uri);
    const doc = data == null ? undefined : this.factory.create(uri, data.format, data.version, data.content);
    if (doc != null) {
      this.documents.set(uri, doc);
    }
    return doc;
  }
}
