import { Diagnostic } from './diagnostic';

export interface DiagnosticDismissalStore {
  getDismissals(uri: string, source: string): Promise<Set<string> | undefined>;
  addDismissal(uri: string, diagnostic: Diagnostic): Promise<void>;
  removeDismissals(uri: string, source: string, fingerprints: Set<string>): Promise<void>;
}

export class InMemoryDiagnosticDismissalStore implements DiagnosticDismissalStore {
  private readonly dismissals = new Map<string, Map<string, Set<string>>>();

  getDismissals(uri: string, source: string): Promise<Set<string> | undefined> {
    return Promise.resolve(this.dismissals.get(uri)?.get(source));
  }

  addDismissal(uri: string, diagnostic: Diagnostic): Promise<void> {
    if (diagnostic.fingerprint == null) {
      return Promise.resolve();
    }
    let dismissedForDoc = this.dismissals.get(uri);
    if (dismissedForDoc == null) {
      dismissedForDoc = new Map<string, Set<string>>();
      this.dismissals.set(uri, dismissedForDoc);
    }
    let dismissedForSource = dismissedForDoc.get(diagnostic.source);
    if (dismissedForSource == null) {
      dismissedForSource = new Set<string>();
      dismissedForDoc.set(diagnostic.source, dismissedForSource);
    }
    dismissedForSource.add(diagnostic.fingerprint);
    return Promise.resolve();
  }

  removeDismissals(uri: string, source: string, fingerprints: Set<string>): Promise<void> {
    const dismissedForDoc = this.dismissals.get(uri)?.get(source);
    if (dismissedForDoc != null) {
      for (const fingerprint of fingerprints) {
        dismissedForDoc.delete(fingerprint);
      }
    }
    return Promise.resolve();
  }
}
