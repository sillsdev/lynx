# Implementing a DiagnosticDismissalStore

`DiagnosticDismissalStore` is the interface `Workspace` uses to record which diagnostics a user has permanently dismissed. When a diagnostic is dismissed its fingerprint is stored, and `Workspace` filters it out of all future `getDiagnostics()` and `diagnosticsChanged$` results for that document.

By default `Workspace` uses `InMemoryDiagnosticDismissalStore`, which holds dismissals only for the duration of the current process. Implement this interface when you need dismissals to survive process restarts.

## The Interface

```ts
import { Diagnostic, DiagnosticDismissalStore } from '@sillsdev/lynx';

export class MyDismissalStore implements DiagnosticDismissalStore {
  getDismissals(uri: string, source: string): Promise<Set<string> | undefined> { ... }
  addDismissal(uri: string, diagnostic: Diagnostic): Promise<void> { ... }
  removeDismissals(uri: string, source: string, fingerprints: Set<string>): Promise<void> { ... }
}
```

## Method Contracts

### `getDismissals(uri, source)`

Called by `Workspace` every time it filters a provider's diagnostics — on both pull (`getDiagnostics()`) and push (`diagnosticsChanged$`) paths.

- Return `undefined` if no dismissals have been recorded for this `uri`+`source` combination. `Workspace` short-circuits on `undefined` and yields all diagnostics without filtering.
- Return a `Set<string>` of dismissed fingerprints otherwise.

### `addDismissal(uri, diagnostic)`

Called by `Workspace.dismissDiagnostic()` when the user dismisses a diagnostic.

- Store the dismissal based on `diagnostic.fingerprint`. If `diagnostic.fingerprint` is `null` or `undefined`, return without storing anything.

### `removeDismissals(uri, source, fingerprints)`

Called by `Workspace` during filtering when dismissed fingerprints no longer appear in the provider's current diagnostic output — meaning the underlying issue was fixed and the dismissal record is stale.

- Remove each dismissal based on the fingerprints in the supplied `Set` from the store. Silently ignore any that are not present.

---

## Implementation Guidance

### Cache dismissals in memory

`getDismissals` is called on every diagnostic filtering pass, which happens frequently. Implementations should maintain an in-memory cache of the full dismissal set, loading it lazily from the backing store on the first method call. Subsequent calls read from the cache without any expensive I/O calls.

`addDismissal` and `removeDismissals` update the cache immediately, so the next `getDismissals` call reflects the change without waiting for the backing store to be written.

### Use fire-and-forget writes

Writes to the backing store should not block the caller. After updating the cache, trigger the persist operation in the background and return. Serializing concurrent writes (e.g. queuing them onto a shared promise) avoids write conflicts without making callers wait.

---

## Example Implementation

The following example persists dismissals to a JSON file. It demonstrates the two key patterns from the guidance above: a lazily-initialized in-memory cache and a fire-and-forget write queue.

```ts
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { Diagnostic, DiagnosticDismissalStore } from '@sillsdev/lynx';

// On-disk format: { [uri]: { [source]: string[] } }
type DismissalData = Record<string, Record<string, string[]>>;

export class JsonFileDismissalStore implements DiagnosticDismissalStore {
  // In-memory cache — the source of truth for all reads after initialization.
  private data: DismissalData = {};
  private initialized = false;

  // Serializes concurrent writes so they don't clobber each other.
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  // Loads data from disk on the first call, then returns immediately on
  // subsequent calls.
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const content = await readFile(this.filePath, 'utf-8');
      this.data = JSON.parse(content) as DismissalData;
    } catch (e: unknown) {
      // ENOENT just means no dismissals have been saved yet — that's fine.
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
  }

  async getDismissals(uri: string, source: string): Promise<Set<string> | undefined> {
    await this.ensureInitialized();
    if (uri in this.data && source in this.data[uri]) {
      return new Set(this.data[uri][source]);
    }
    return undefined;
  }

  async addDismissal(uri: string, diagnostic: Diagnostic): Promise<void> {
    await this.ensureInitialized();
    if (diagnostic.fingerprint == null) return;

    this.data[uri] ??= {};
    this.data[uri][diagnostic.source] ??= [];

    const existing = this.data[uri][diagnostic.source];
    if (!existing.includes(diagnostic.fingerprint)) {
      existing.push(diagnostic.fingerprint);
    }

    this.enqueueWrite();
  }

  async removeDismissals(uri: string, source: string, fingerprints: Set<string>): Promise<void> {
    await this.ensureInitialized();
    if (!(uri in this.data) || !(source in this.data[uri])) return;

    this.data[uri][source] = this.data[uri][source].filter((f) => !fingerprints.has(f));

    // Clean up empty entries so the file doesn't grow indefinitely.
    if (this.data[uri][source].length === 0) delete this.data[uri][source];
    if (Object.keys(this.data[uri]).length === 0) delete this.data[uri];

    this.enqueueWrite();
  }

  // Chains the next persist() call onto the end of writeQueue so writes are
  // serialized without blocking the caller.
  private enqueueWrite(): void {
    this.writeQueue = this.writeQueue
      .then(() => this.persist())
      .catch(() => {
        /* swallow write errors */
      });
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(this.data, null, 2));
  }
}
```

---

## Registering the Store

Pass the store in the `Workspace` constructor or assign it to the property:

```ts
// Option 1: constructor
const workspace = new Workspace({
  localizer,
  diagnosticProviders: [...],
  diagnosticDismissalStore: new MyDismissalStore(),
});

// Option 2: property assignment (before or after init())
workspace.diagnosticDismissalStore = new MyDismissalStore();
```
