import { concatMap, merge, Observable, tap } from 'rxjs';

import { Position } from '../common/position';
import { TextEdit } from '../common/text-edit';
import { Diagnostic } from '../diagnostic/diagnostic';
import { DiagnosticAction } from '../diagnostic/diagnostic-action';
import { DiagnosticDismissalStore, InMemoryDiagnosticDismissalStore } from '../diagnostic/diagnostic-dismissal-store';
import { DiagnosticProvider, DiagnosticsChanged } from '../diagnostic/diagnostic-provider';
import { OnTypeFormattingProvider } from '../formatting/on-type-formatting-provider';
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
  diagnosticDismissalStore: DiagnosticDismissalStore;

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
    ).pipe(concatMap((e) => this.getCombinedDiagnosticChangedEvent(e.uri, e.version)));
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
      const providerDiagnostics = await provider.getDiagnostics(uri);
      for await (const diagnostic of this.filterDismissedDiagnostics(uri, provider.id, providerDiagnostics)) {
        diagnostics.push(diagnostic);
      }
    }
    return diagnostics;
  }

  async getDiagnosticActions(uri: string, diagnostic: Diagnostic): Promise<DiagnosticAction<T>[]> {
    const provider = this.diagnosticProviders.get(diagnostic.source);
    if (provider == null) {
      throw new Error(`No provider found for diagnostic source ${diagnostic.source}.`);
    }
    return await provider.getDiagnosticActions(uri, diagnostic);
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

  async dismissDiagnostic(uri: string, diagnostic: Diagnostic): Promise<boolean> {
    if (diagnostic.fingerprint == null) {
      throw new Error('Cannot dismiss a diagnostic without a fingerprint.');
    }
    await this.diagnosticDismissalStore.addDismissal(uri, diagnostic);

    // Trigger a refresh on the provider that owns this diagnostic
    const provider = this.diagnosticProviders.get(diagnostic.source);
    if (provider == null) {
      throw new Error(`No provider found for diagnostic source ${diagnostic.source}.`);
    }
    await provider.refresh(uri);
    return true;
  }

  getDiagnosticActionCommands(): [string, string][] {
    const commands: [string, string][] = [];
    for (const provider of this.diagnosticProviders.values()) {
      for (const command of provider.commands) {
        commands.push([provider.id, command]);
      }
    }
    return commands;
  }

  async executeDiagnosticActionCommand(command: string, uri: string, diagnostic: Diagnostic): Promise<boolean> {
    const provider = this.diagnosticProviders.get(diagnostic.source);
    if (provider == null) {
      throw new Error(`No provider found for diagnostic source ${diagnostic.source}.`);
    }
    if (!provider.commands.has(command)) {
      throw new Error(`Provider ${provider.id} does not support command ${command}.`);
    }
    if (await provider.executeCommand(command, uri, diagnostic)) {
      await provider.refresh(uri);
      return true;
    }
    return false;
  }

  private updateCombinedDiagnosticChangedEvent(providerIndex: number, providerId: string, event: DiagnosticsChanged) {
    const docEvents = this.lastDiagnosticChangedEvents.get(event.uri) ?? [];
    docEvents[providerIndex] = { source: providerId, event: event };
    this.lastDiagnosticChangedEvents.set(event.uri, docEvents);
  }

  private async getCombinedDiagnosticChangedEvent(uri: string, version?: number): Promise<DiagnosticsChanged> {
    const docEvents = this.lastDiagnosticChangedEvents.get(uri) ?? [];
    const diagnostics: Diagnostic[] = [];
    for (const docEvent of docEvents) {
      if (docEvent != null && (version == null || docEvent.event.version === version)) {
        for await (const diagnostic of this.filterDismissedDiagnostics(
          uri,
          docEvent.source,
          docEvent.event.diagnostics,
        )) {
          diagnostics.push(diagnostic);
        }
      }
    }
    return {
      uri: uri,
      version: version,
      diagnostics: diagnostics,
    };
  }

  private async *filterDismissedDiagnostics(
    uri: string,
    source: string,
    diagnostics: Diagnostic[],
  ): AsyncIterable<Diagnostic> {
    const dismissedForDoc = await this.diagnosticDismissalStore.getDismissals(uri, source);
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
      await this.diagnosticDismissalStore.removeDismissals(uri, source, fingerprintsToCleanup);
    }
  }
}
