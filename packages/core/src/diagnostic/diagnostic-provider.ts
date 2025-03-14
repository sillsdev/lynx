import { concat, defer, from, map, merge, mergeMap, Observable, switchMap } from 'rxjs';

import { TextEdit } from '../common/text-edit';
import { Document } from '../document/document';
import { DocumentAccessor } from '../document/document-accessor';
import { Diagnostic } from './diagnostic';
import { DiagnosticFix } from './diagnostic-fix';

export interface DiagnosticsChanged {
  uri: string;
  version?: number;
  diagnostics: Diagnostic[];
}

export interface DiagnosticProvider<T = TextEdit> {
  readonly id: string;
  readonly diagnosticsChanged$: Observable<DiagnosticsChanged>;
  init(): Promise<void>;
  getDiagnostics(uri: string): Promise<Diagnostic[]>;
  getDiagnosticFixes(uri: string, diagnostic: Diagnostic): Promise<DiagnosticFix<T>[]>;
}

export function activeDiagnosticsChanged$<T extends Document>(
  documents: DocumentAccessor<T>,
  validateDocument: (doc: T) => Diagnostic[],
): Observable<DiagnosticsChanged> {
  return merge(
    documents.opened$.pipe(
      map((e) => ({
        uri: e.document.uri,
        version: e.document.version,
        diagnostics: validateDocument(e.document),
      })),
    ),
    documents.changed$.pipe(
      map((e) => ({
        uri: e.document.uri,
        version: e.document.version,
        diagnostics: validateDocument(e.document),
      })),
    ),
    documents.closed$.pipe(
      switchMap(async (e) => {
        const doc = await documents.get(e.uri);
        return { uri: e.uri, version: doc?.version, diagnostics: [] };
      }),
    ),
  );
}

export function allDiagnosticsChanged$<T extends Document>(
  documents: DocumentAccessor<T>,
  validateDocument: (doc: T) => Diagnostic[],
): Observable<DiagnosticsChanged> {
  return concat(
    defer(() => from(documents.all())).pipe(
      mergeMap((docs) => docs),
      map((doc) => ({ uri: doc.uri, version: doc.version, diagnostics: validateDocument(doc) })),
    ),
    merge(
      documents.opened$.pipe(
        map((e) => ({
          uri: e.document.uri,
          version: e.document.version,
          diagnostics: validateDocument(e.document),
        })),
      ),
      documents.changed$.pipe(
        map((e) => ({
          uri: e.document.uri,
          version: e.document.version,
          diagnostics: validateDocument(e.document),
        })),
      ),
      documents.created$.pipe(
        map((e) => ({
          uri: e.document.uri,
          version: e.document.version,
          diagnostics: validateDocument(e.document),
        })),
      ),
      documents.deleted$.pipe(map((e) => ({ uri: e.uri, diagnostics: [] }))),
      documents.reset$.pipe(
        switchMap((_) => documents.all()),
        mergeMap((docs) => docs),
        map((doc) => ({ uri: doc.uri, version: doc.version, diagnostics: validateDocument(doc) })),
      ),
    ),
  );
}
