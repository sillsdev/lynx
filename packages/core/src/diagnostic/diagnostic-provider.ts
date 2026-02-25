import {
  concat,
  concatMap,
  connectable,
  defer,
  finalize,
  from,
  map,
  merge,
  mergeMap,
  Observable,
  ReplaySubject,
  Subject,
  switchMap,
} from 'rxjs';

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
  refresh(uri: string): Promise<void>;
}

export function activeDiagnosticsChanged$<T extends Document>(
  documents: DocumentAccessor<T>,
  validateDocument: (doc: T) => Promise<Diagnostic[]>,
  refreshSubject?: Subject<string>,
): Observable<DiagnosticsChanged> {
  const streams: Observable<DiagnosticsChanged>[] = [
    documents.opened$.pipe(
      concatMap(async (e) => ({
        uri: e.document.uri,
        version: e.document.version,
        diagnostics: await validateDocument(e.document),
      })),
    ),
    documents.changed$.pipe(
      concatMap(async (e) => ({
        uri: e.document.uri,
        version: e.document.version,
        diagnostics: await validateDocument(e.document),
      })),
    ),
    documents.closed$.pipe(
      concatMap(async (e) => {
        const doc = await documents.get(e.uri);
        return { uri: e.uri, version: doc?.version, diagnostics: [] };
      }),
    ),
  ];
  if (refreshSubject != null) {
    streams.push(
      refreshSubject.pipe(
        concatMap(async (uri): Promise<DiagnosticsChanged> => {
          const doc = await documents.get(uri);
          return { uri, version: doc?.version, diagnostics: doc != null ? await validateDocument(doc) : [] };
        }),
      ),
    );
  }
  return merge(...streams);
}

export function allDiagnosticsChanged$<T extends Document>(
  documents: DocumentAccessor<T>,
  validateDocument: (doc: T) => Promise<Diagnostic[]>,
  refreshSubject?: Subject<string>,
): Observable<DiagnosticsChanged> {
  // Live document lifecycle streams that may emit while initial full validation is running.
  const streams: Observable<DiagnosticsChanged>[] = [
    documents.opened$.pipe(
      concatMap(async (e) => ({
        uri: e.document.uri,
        version: e.document.version,
        diagnostics: await validateDocument(e.document),
      })),
    ),
    documents.changed$.pipe(
      concatMap(async (e) => ({
        uri: e.document.uri,
        version: e.document.version,
        diagnostics: await validateDocument(e.document),
      })),
    ),
    documents.created$.pipe(
      concatMap(async (e) => ({
        uri: e.document.uri,
        version: e.document.version,
        diagnostics: await validateDocument(e.document),
      })),
    ),
    documents.deleted$.pipe(map((e) => ({ uri: e.uri, diagnostics: [] }))),
    documents.reset$.pipe(
      switchMap((_) => documents.all()),
      mergeMap((docs) => docs),
      mergeMap(async (doc) => ({ uri: doc.uri, version: doc.version, diagnostics: await validateDocument(doc) })),
    ),
  ];
  if (refreshSubject != null) {
    streams.push(
      refreshSubject.pipe(
        switchMap(async (uri) => {
          const doc = await documents.get(uri);
          return { uri, version: doc?.version, diagnostics: doc != null ? await validateDocument(doc) : [] };
        }),
      ),
    );
  }

  // Two-phase emission strategy:
  // 1) Emit diagnostics for all currently known documents (initial snapshot pass).
  // 2) Then continue with live document events.
  //
  // To avoid missing live events that occur during phase (1), we connect and buffer
  // live streams immediately using a ReplaySubject-backed connectable observable.
  //
  // Each call to the returned observable (i.e. each subscriber) gets its own
  // independent connectable + ReplaySubject, ensuring full isolation between
  // concurrent subscribers.
  return defer(() => {
    const liveStreams$ = connectable(merge(...streams), {
      connector: () => new ReplaySubject<DiagnosticsChanged>(),
    });
    // Start capturing live events now, before initial documents are validated.
    const connection = liveStreams$.connect();

    return concat(
      // Initial full validation pass over all known documents.
      defer(() => from(documents.all())).pipe(
        mergeMap((docs) => docs),
        mergeMap(async (doc) => ({ uri: doc.uri, version: doc.version, diagnostics: await validateDocument(doc) })),
      ),
      // Replay any buffered live events, then continue streaming new live events.
      liveStreams$,
    ).pipe(
      finalize(() => {
        // Ensure we tear down the live connection when downstream unsubscribes/completes.
        connection.unsubscribe();
      }),
    );
  });
}
