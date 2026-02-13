import { map, merge, Observable, tap } from 'rxjs';

import { Position } from '../common/position';
import { TextEdit } from '../common/text-edit';
import { Diagnostic } from '../diagnostic/diagnostic';
import { DiagnosticFix } from '../diagnostic/diagnostic-fix';
import { DiagnosticProvider, DiagnosticsChanged } from '../diagnostic/diagnostic-provider';
import { OnTypeFormattingProvider } from '../formatting/on-type-formatting-provider';
import { DiagnosticDismissalStore, InMemoryDiagnosticDismissalStore } from './diagnostic-dismissal-store';
import { Localizer } from './localizer';

export interface WorkspaceConfig<T = TextEdit> {
  localizer: Localizer;
  diagnosticProviders?: DiagnosticProvider<T>[];
  onTypeFormattingProviders?: OnTypeFormattingProvider<T>[];
  diagnosticDismissalStore?: DiagnosticDismissalStore;
}

export class Workspace<T = TextEdit> {
  private readonly localizer: Localizer;
  private readonly diagnosticProviders: Map<string, DiagnosticProvider<T>>;
  private readonly onTypeFormattingProviders: Map<string, OnTypeFormattingProvider<T>>;
  private readonly lastDiagnosticChangedEvents = new Map<
    string,
    ({ source: string; event: DiagnosticsChanged } | undefined)[]
  >();
  private readonly diagnosticDismissalStore: DiagnosticDismissalStore;

  public readonly diagnosticsChanged$: Observable<DiagnosticsChanged>;

  constructor(config: WorkspaceConfig<T>) {
    this.localizer = config.localizer;
    this.diagnosticProviders = new Map(config.diagnosticProviders?.map((provider) => [provider.id, provider]));
    this.diagnosticDismissalStore = config.diagnosticDismissalStore ?? new InMemoryDiagnosticDismissalStore();
    this.diagnosticsChanged$ = merge(
      ...Array.from(this.diagnosticProviders.values()).map((provider, i) =>
        provider.diagnosticsChanged$.pipe(
          tap((e) => {
            this.updateCombinedDiagnosticChangedEvent(i, provider.id, e);
          }),
        ),
      ),
    ).pipe(map((e) => this.getCombinedDiagnosticChangedEvent(e.uri, e.version)));
    this.onTypeFormattingProviders = new Map(
      config.onTypeFormattingProviders?.map((provider) => [provider.id, provider]),
    );
  }

  async init(): Promise<void> {
    await Promise.all(Array.from(this.diagnosticProviders.values()).map((provider) => provider.init()));
    await Promise.all(Array.from(this.onTypeFormattingProviders.values()).map((provider) => provider.init()));
    await this.localizer.init();
  }

  changeLanguage(language: string): Promise<void> {
    return this.localizer.changeLanguage(language);
  }

  async getDiagnostics(uri: string): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];
    for (const provider of this.diagnosticProviders.values()) {
      diagnostics.push(...this.filterDismissedDiagnostics(uri, provider.id, await provider.getDiagnostics(uri)));
    }
    return diagnostics;
  }

  async getDiagnosticFixes(uri: string, diagnostic: Diagnostic): Promise<DiagnosticFix<T>[]> {
    const provider = this.diagnosticProviders.get(diagnostic.source);
    if (provider == null) {
      return [];
    }
    return await provider.getDiagnosticFixes(uri, diagnostic);
  }

  getOnTypeTriggerCharacters(): string[] {
    const characters = new Set<string>();
    for (const provider of this.onTypeFormattingProviders.values()) {
      for (const ch of provider.onTypeTriggerCharacters) {
        characters.add(ch);
      }
    }
    return Array.from(characters);
  }

  async getOnTypeEdits(uri: string, position: Position, ch: string): Promise<T[] | undefined> {
    for (const provider of this.onTypeFormattingProviders.values()) {
      if (provider.onTypeTriggerCharacters.has(ch)) {
        const edits = await provider.getOnTypeEdits(uri, position, ch);
        if (edits != null) {
          return edits;
        }
      }
    }
    return undefined;
  }

  dismissDiagnostic(uri: string, diagnostic: Diagnostic): boolean {
    if (diagnostic.fingerprint == null) {
      return false;
    }
    this.diagnosticDismissalStore.addDismissal(uri, diagnostic);

    // Trigger a refresh on the provider that owns this diagnostic
    const provider = this.diagnosticProviders.get(diagnostic.source);
    if (provider != null) {
      provider.refresh(uri);
    }
    return true;
  }

  private updateCombinedDiagnosticChangedEvent(providerIndex: number, providerId: string, event: DiagnosticsChanged) {
    const docEvents = this.lastDiagnosticChangedEvents.get(event.uri) ?? [];
    docEvents[providerIndex] = { source: providerId, event: event };
    this.lastDiagnosticChangedEvents.set(event.uri, docEvents);
  }

  private getCombinedDiagnosticChangedEvent(uri: string, version?: number): DiagnosticsChanged {
    const docEvents = this.lastDiagnosticChangedEvents.get(uri) ?? [];
    const diagnostics: Diagnostic[] = [];
    for (const docEvent of docEvents) {
      if (docEvent != null && (version == null || docEvent.event.version === version)) {
        diagnostics.push(...this.filterDismissedDiagnostics(uri, docEvent.source, docEvent.event.diagnostics));
      }
    }
    return {
      uri: uri,
      version: version,
      diagnostics: diagnostics,
    };
  }

  private *filterDismissedDiagnostics(uri: string, source: string, diagnostics: Diagnostic[]): Iterable<Diagnostic> {
    const dismissedForDoc = this.diagnosticDismissalStore.getDismissals(uri, source);
    if (dismissedForDoc == null) {
      yield* diagnostics;
    } else {
      const fingerprintsToCleanup = new Set<string>(dismissedForDoc);
      for (const diagnostic of diagnostics) {
        if (diagnostic.fingerprint != null && dismissedForDoc.has(diagnostic.fingerprint)) {
          fingerprintsToCleanup.delete(diagnostic.fingerprint);
        } else {
          yield diagnostic;
        }
      }
      for (const fingerprint of fingerprintsToCleanup) {
        this.diagnosticDismissalStore.removeDismissal(uri, source, fingerprint);
      }
    }
  }
}
