import { map, merge, Observable, tap } from 'rxjs';

import { Diagnostic } from '../diagnostic/diagnostic';
import { DiagnosticProvider, DiagnosticProviderFactory, DiagnosticsChanged } from '../diagnostic/diagnostic-provider';
import { Document } from '../document/document';
import { DocumentFactory } from '../document/document-factory';
import { DocumentManager } from '../document/document-manager';
import { DocumentReader } from '../document/document-reader';

export interface WorkspaceConfig<T extends Document> {
  documentReader?: DocumentReader;
  documentFactory: DocumentFactory<T>;
  diagnosticProviders: DiagnosticProviderFactory<T>[];
}

export class Workspace<T extends Document> {
  private readonly diagnosticProviders: DiagnosticProvider[];
  private readonly lastDiagnosticChangedEvents = new Map<string, DiagnosticsChanged[]>();

  public readonly documentManager: DocumentManager<T>;
  public readonly diagnosticsChanged$: Observable<DiagnosticsChanged>;

  constructor(config: WorkspaceConfig<T>) {
    this.documentManager = new DocumentManager(config.documentReader, config.documentFactory);
    this.diagnosticProviders = config.diagnosticProviders.map((factory) => factory(this.documentManager));
    this.diagnosticsChanged$ = merge(
      ...this.diagnosticProviders.map((provider, i) =>
        provider.diagnosticsChanged$.pipe(
          tap((e) => {
            this.updateCombinedDiagnosticChangedEvent(i, e);
          }),
        ),
      ),
    ).pipe(map((e) => this.getCombinedDiagnosticChangedEvent(e.uri, e.version)));
  }

  getDiagnostics(uri: string): Diagnostic[] {
    return this.diagnosticProviders.reduce<Diagnostic[]>((diagnostics, provider) => {
      return diagnostics.concat(provider.getDiagnostics(uri));
    }, []);
  }

  private updateCombinedDiagnosticChangedEvent(providerIndex: number, event: DiagnosticsChanged) {
    const docEvents = this.lastDiagnosticChangedEvents.get(event.uri) ?? [];
    docEvents[providerIndex] = event;
    this.lastDiagnosticChangedEvents.set(event.uri, docEvents);
  }

  private getCombinedDiagnosticChangedEvent(uri: string, version?: number): DiagnosticsChanged {
    const docEvents = this.lastDiagnosticChangedEvents.get(uri) ?? [];
    const diagnostics: Diagnostic[] = [];
    for (const docEvent of docEvents) {
      if (version == null || docEvent.version === version) {
        diagnostics.push(...docEvent.diagnostics);
      }
    }
    return {
      uri: uri,
      version: version,
      diagnostics: diagnostics,
    };
  }
}
