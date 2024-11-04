import { map, merge, Observable, tap } from 'rxjs';

import { Position } from '../common/position';
import { TextEdit } from '../common/text-edit';
import { Diagnostic } from '../diagnostic/diagnostic';
import { DiagnosticFix } from '../diagnostic/diagnostic-fix';
import { DiagnosticProvider, DiagnosticsChanged } from '../diagnostic/diagnostic-provider';
import { OnTypeFormattingProvider } from '../formatting/on-type-formatting-provider';

export interface WorkspaceConfig {
  diagnosticProviders?: DiagnosticProvider[];
  onTypeFormattingProviders?: OnTypeFormattingProvider[];
}

export class Workspace {
  private readonly diagnosticProviders: Map<string, DiagnosticProvider>;
  private readonly onTypeFormattingProviders: Map<string, OnTypeFormattingProvider>;
  private readonly lastDiagnosticChangedEvents = new Map<string, DiagnosticsChanged[]>();

  public readonly diagnosticsChanged$: Observable<DiagnosticsChanged>;

  constructor(config: WorkspaceConfig) {
    this.diagnosticProviders = new Map(config.diagnosticProviders?.map((provider) => [provider.id, provider]));
    this.diagnosticsChanged$ = merge(
      ...Array.from(this.diagnosticProviders.values()).map((provider, i) =>
        provider.diagnosticsChanged$.pipe(
          tap((e) => {
            this.updateCombinedDiagnosticChangedEvent(i, e);
          }),
        ),
      ),
    ).pipe(map((e) => this.getCombinedDiagnosticChangedEvent(e.uri, e.version)));
    this.onTypeFormattingProviders = new Map(
      config.onTypeFormattingProviders?.map((provider) => [provider.id, provider]),
    );
  }

  async getDiagnostics(uri: string): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];
    for (const provider of this.diagnosticProviders.values()) {
      diagnostics.push(...(await provider.getDiagnostics(uri)));
    }
    return diagnostics;
  }

  async getDiagnosticFixes(uri: string, diagnostic: Diagnostic): Promise<DiagnosticFix[]> {
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

  async getOnTypeEdits(uri: string, position: Position, ch: string): Promise<TextEdit[] | undefined> {
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
