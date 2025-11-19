import { Observable, Subject } from 'rxjs';

import { Document, DocumentChanges, DocumentData } from './document';
import {
  DocumentAccessor,
  DocumentChanged,
  DocumentClosed,
  DocumentCreated,
  DocumentDeleted,
  DocumentOpened,
  DocumentsReset,
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
  private readonly resetSubject = new Subject<DocumentsReset>();

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

  get reset$(): Observable<DocumentsReset> {
    return this.resetSubject.asObservable();
  }

  add(doc: TDoc): void {
    this.documents.set(doc.uri, doc);
    this.activeDocuments.add(doc.uri);
  }

  async get(uri: string): Promise<TDoc | undefined> {
    let doc = this.documents.get(uri);
    doc ??= await this.reload(uri);
    return doc;
  }

  async all(): Promise<TDoc[]> {
    const docIds = new Set<string>();
    const docs = new Array<TDoc>(this.documents.size);
    let i = 0;
    for (const [uri, doc] of this.documents) {
      docIds.add(uri);
      docs[i] = doc;
      i++;
    }
    if (this.reader != null) {
      for (const id of await this.reader.keys()) {
        if (docIds.has(id)) continue;
        const doc = await this.get(id);
        if (doc != null) {
          docIds.add(id);
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

  async fireCreated(uri: string, data?: DocumentData<TContent>): Promise<void> {
    let doc: TDoc | undefined = undefined;
    if (data == null) {
      doc = await this.reload(uri);
    } else {
      doc = this.factory.create(uri, data);
      this.documents.set(uri, doc);
    }
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

  async fireOpened(uri: string, data?: DocumentData<TContent>): Promise<void> {
    let doc: TDoc | undefined = undefined;
    if (data == null) {
      doc = await this.reload(uri);
    } else {
      doc = this.factory.create(uri, data);
      this.documents.set(uri, doc);
    }
    this.activeDocuments.add(uri);
    if (doc != null) {
      this.openedSubject.next({ document: doc });
    }
  }

  fireDeleted(uri: string): Promise<void> {
    this.documents.delete(uri);
    this.activeDocuments.delete(uri);
    this.deletedSubject.next({ uri: uri });
    return Promise.resolve();
  }

  async fireChanged(uri: string, changes?: DocumentChanges<TChange>): Promise<void> {
    let doc: TDoc | undefined = undefined;
    if (changes == null) {
      doc = await this.reload(uri);
    } else {
      doc = await this.get(uri);
      if (doc != null) {
        doc = this.factory.update(doc, changes);
        this.documents.set(uri, doc);
      }
    }
    if (doc != null) {
      this.changedSubject.next({ document: doc });
    }
  }

  reset(): Promise<void> {
    const loadedUris = Array.from(this.documents.keys());
    const activeUris = Array.from(this.activeDocuments);
    this.documents.clear();
    this.activeDocuments.clear();
    this.resetSubject.next({ loadedUris, activeUris });
    return Promise.resolve();
  }

  private async reload(uri: string): Promise<TDoc | undefined> {
    if (this.reader == null) {
      return this.documents.get(uri);
    }
    const data = await this.reader.read(uri);
    const doc = data == null ? undefined : this.factory.create(uri, data);
    if (doc != null) {
      this.documents.set(uri, doc);
    }
    return doc;
  }
}
