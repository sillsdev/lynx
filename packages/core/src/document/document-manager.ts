import { Observable, Subject } from 'rxjs';

import { Document } from './document';
import {
  DocumentAccessor,
  DocumentChanged,
  DocumentClosed,
  DocumentCreated,
  DocumentDeleted,
  DocumentOpened,
} from './document-accessor';
import { DocumentFactory } from './document-factory';
import { DocumentReader } from './document-reader';
import { TextDocumentChange } from './text-document-change';

export class DocumentManager<TDoc extends Document = Document, TChange = TextDocumentChange, TContent = string>
  implements DocumentAccessor<TDoc>
{
  private readonly documents = new Map<string, TDoc>();
  private readonly activeDocuments = new Set<string>();
  private readonly createdSubject = new Subject<DocumentCreated<TDoc>>();
  private readonly closedSubject = new Subject<DocumentClosed>();
  private readonly openedSubject = new Subject<DocumentOpened<TDoc>>();
  private readonly deletedSubject = new Subject<DocumentDeleted>();
  private readonly changedSubject = new Subject<DocumentChanged<TDoc>>();

  constructor(
    private readonly factory: DocumentFactory<TDoc, TChange, TContent>,
    private readonly reader?: DocumentReader<TContent>,
  ) {}

  get created$(): Observable<DocumentCreated<TDoc>> {
    return this.createdSubject.asObservable();
  }

  get closed$(): Observable<DocumentClosed> {
    return this.closedSubject.asObservable();
  }

  get opened$(): Observable<DocumentOpened<TDoc>> {
    return this.openedSubject.asObservable();
  }

  get deleted$(): Observable<DocumentDeleted> {
    return this.deletedSubject.asObservable();
  }

  get changed$(): Observable<DocumentChanged<TDoc>> {
    return this.changedSubject.asObservable();
  }

  add(doc: TDoc): void {
    this.documents.set(doc.uri, doc);
    this.activeDocuments.add(doc.uri);
  }

  async get(uri: string): Promise<TDoc | undefined> {
    let doc = this.documents.get(uri);
    if (doc == null) {
      doc = await this.reload(uri);
    }
    return doc;
  }

  async all(): Promise<TDoc[]> {
    const docs = Array.from(this.documents.values());
    if (this.reader != null) {
      for (const id of this.reader.keys()) {
        if (this.documents.has(id)) continue;
        const doc = await this.get(id);
        if (doc != null) {
          docs.push(doc);
        }
      }
    }
    return docs;
  }

  async active(): Promise<TDoc[]> {
    const docs: TDoc[] = [];
    for (const uri of this.activeDocuments) {
      const doc = await this.get(uri);
      if (doc != null) {
        docs.push(doc);
      }
    }
    return docs;
  }

  async fireCreated(uri: string): Promise<void> {
    const doc = await this.get(uri);
    if (doc != null) {
      this.createdSubject.next({ document: doc });
    }
  }

  fireClosed(uri: string): Promise<void> {
    this.documents.delete(uri);
    this.activeDocuments.delete(uri);
    this.closedSubject.next({ uri: uri });
    return Promise.resolve();
  }

  fireOpened(uri: string, format: string, version: number, content: TContent): Promise<void> {
    const doc = this.factory.create(uri, format, version, content);
    this.documents.set(uri, doc);
    this.activeDocuments.add(uri);
    this.openedSubject.next({ document: doc });
    return Promise.resolve();
  }

  fireDeleted(uri: string): Promise<void> {
    this.documents.delete(uri);
    this.deletedSubject.next({ uri: uri });
    return Promise.resolve();
  }

  async fireChanged(uri: string, changes?: readonly TChange[], version?: number): Promise<void> {
    let doc: TDoc | undefined = undefined;
    if (changes == null) {
      doc = await this.reload(uri);
    } else {
      doc = await this.get(uri);
      if (doc != null) {
        doc = this.factory.update(doc, changes, version ?? 0);
        this.documents.set(uri, doc);
      }
    }
    if (doc != null) {
      this.changedSubject.next({ document: doc });
    }
  }

  private async reload(uri: string): Promise<TDoc | undefined> {
    const data = await this.reader?.read(uri);
    const doc = data == null ? undefined : this.factory.create(uri, data.format, data.version, data.content);
    if (doc != null) {
      this.documents.set(uri, doc);
    }
    return doc;
  }
}
