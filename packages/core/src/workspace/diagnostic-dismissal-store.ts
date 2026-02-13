import { Diagnostic } from '../diagnostic/diagnostic';

/**
 * Interface for persisting diagnostic dismissals.
 * Implementations can store dismissals in memory, local storage, databases, etc.
 */
export interface DiagnosticDismissalStore {
  /**
   * Gets the set of dismissed diagnostic fingerprints for a specific URI and source.
   * @param uri The document URI
   * @param source The diagnostic provider source
   * @returns A set of dismissed fingerprints, or undefined if none exist
   */
  getDismissals(uri: string, source: string): Set<string> | undefined;

  /**
   * Adds a diagnostic dismissal.
   * @param uri The document URI
   * @param diagnostic The diagnostic to dismiss
   */
  addDismissal(uri: string, diagnostic: Diagnostic): void;

  /**
   * Removes a diagnostic dismissal (typically for cleanup when diagnostic no longer exists).
   * @param uri The document URI
   * @param source The diagnostic provider source
   * @param fingerprint The diagnostic fingerprint to remove
   */
  removeDismissal(uri: string, source: string, fingerprint: string): void;
}

/**
 * Default in-memory implementation of DiagnosticDismissalStore.
 */
export class InMemoryDiagnosticDismissalStore implements DiagnosticDismissalStore {
  private readonly dismissals = new Map<string, Set<string>>();

  private getKey(uri: string, source: string): string {
    return `${source}|${uri}`;
  }

  getDismissals(uri: string, source: string): Set<string> | undefined {
    return this.dismissals.get(this.getKey(uri, source));
  }

  addDismissal(uri: string, diagnostic: Diagnostic): void {
    if (diagnostic.fingerprint == null) {
      return;
    }
    const key = this.getKey(uri, diagnostic.source);
    let dismissedForDoc = this.dismissals.get(key);
    if (dismissedForDoc == null) {
      dismissedForDoc = new Set<string>();
      this.dismissals.set(key, dismissedForDoc);
    }
    dismissedForDoc.add(diagnostic.fingerprint);
  }

  removeDismissal(uri: string, source: string, fingerprint: string): void {
    const dismissedForDoc = this.dismissals.get(this.getKey(uri, source));
    if (dismissedForDoc != null) {
      dismissedForDoc.delete(fingerprint);
    }
  }
}
