import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { Diagnostic, DiagnosticDismissalStore } from '@sillsdev/lynx';

export class JsonFileDiagnosticDismissalStore implements DiagnosticDismissalStore {
  private data: Record<string, Record<string, string[]>> = {};
  private initialized = false;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const content = await readFile(this.filePath, 'utf-8');
      this.data = JSON.parse(content);
    } catch (e: unknown) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
      return;
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
    if (diagnostic.fingerprint == null) {
      return;
    }
    if (!(uri in this.data)) {
      this.data[uri] = {};
    }
    if (!(diagnostic.source in this.data[uri])) {
      this.data[uri][diagnostic.source] = [];
    }
    const dismissedForSource = this.data[uri][diagnostic.source];
    if (!dismissedForSource.includes(diagnostic.fingerprint)) {
      dismissedForSource.push(diagnostic.fingerprint);
    }
    this.enqueueWrite();
  }

  async removeDismissals(uri: string, source: string, fingerprints: Set<string>): Promise<void> {
    await this.ensureInitialized();
    if (uri in this.data && source in this.data[uri]) {
      const dismissedForSource = this.data[uri][source];
      this.data[uri][source] = dismissedForSource.filter((f) => !fingerprints.has(f));
      if (this.data[uri][source].length === 0) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete this.data[uri][source];
      }
      if (Object.keys(this.data[uri]).length === 0) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete this.data[uri];
      }
    }
    this.enqueueWrite();
  }

  private enqueueWrite(): void {
    this.writeQueue = this.writeQueue
      .then(() => this.persist())
      .catch(() => {
        /* empty */
      });
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(this.data, null, 2));
  }
}
