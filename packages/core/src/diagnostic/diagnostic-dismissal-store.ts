import { Diagnostic } from './diagnostic';

export interface DiagnosticDismissalStore {
  getDismissals(uri: string, source: string): Promise<Set<string> | undefined>;
  addDismissal(uri: string, diagnostic: Diagnostic): Promise<void>;
  removeDismissals(uri: string, source: string, fingerprints: Iterable<string>): Promise<void>;
}

export class InMemoryDiagnosticDismissalStore implements DiagnosticDismissalStore {
  private readonly dismissals = new Map<string, Set<string>>();

  private getKey(uri: string, source: string): string {
    return `${source}|${uri}`;
  }

  getDismissals(uri: string, source: string): Promise<Set<string> | undefined> {
    return Promise.resolve(this.dismissals.get(this.getKey(uri, source)));
  }

  addDismissal(uri: string, diagnostic: Diagnostic): Promise<void> {
    if (diagnostic.fingerprint == null) {
      return Promise.resolve();
    }
    const key = this.getKey(uri, diagnostic.source);
    let dismissedForDoc = this.dismissals.get(key);
    if (dismissedForDoc == null) {
      dismissedForDoc = new Set<string>();
      this.dismissals.set(key, dismissedForDoc);
    }
    dismissedForDoc.add(diagnostic.fingerprint);
    return Promise.resolve();
  }

  removeDismissals(uri: string, source: string, fingerprints: Iterable<string>): Promise<void> {
    const dismissedForDoc = this.dismissals.get(this.getKey(uri, source));
    if (dismissedForDoc != null) {
      for (const fingerprint of fingerprints) {
        dismissedForDoc.delete(fingerprint);
      }
    }
    return Promise.resolve();
  }
}
