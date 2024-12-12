import i18next, { i18n } from 'i18next';

export class Localizer {
  private readonly i18n: i18n;
  private readonly backend: LocalBackend;

  constructor(language?: string) {
    this.backend = new LocalBackend();
    this.i18n = i18next
      .createInstance({
        lng: language,
        fallbackLng: 'en',
        partialBundledLanguages: true,
        ns: [],
        resources: {},
      })
      .use(this.backend);
  }

  get language(): string {
    return this.i18n.language;
  }

  async init(): Promise<void> {
    await this.i18n.init();
    await this.i18n.loadNamespaces(Array.from(this.backend.namespaces));
  }

  hasNamespace(namespace: string): boolean {
    return this.backend.hasNamespace(namespace);
  }

  addNamespace(namespace: string, loader: (language: string) => unknown): void {
    if (this.i18n.hasLoadedNamespace(namespace)) {
      return;
    }
    this.backend.addNamespace(namespace, loader);
  }

  async changeLanguage(language: string): Promise<void> {
    await this.i18n.changeLanguage(language);
  }

  t(key: string, options?: Record<string, string>): string {
    return this.i18n.t(key, options);
  }
}

class LocalBackend {
  private readonly namespaceLoaders = new Map<string, (language: string) => unknown>();
  readonly type = 'backend';

  get namespaces(): Iterable<string> {
    return this.namespaceLoaders.keys();
  }

  init(_services: unknown, _backendOptions: unknown, _i18nextOptions: unknown): void {
    // do nothing
  }

  hasNamespace(namespace: string): boolean {
    return this.namespaceLoaders.has(namespace);
  }

  addNamespace(namespace: string, loader: (language: string) => unknown): void {
    this.namespaceLoaders.set(namespace, loader);
  }

  read(language: string, namespace: string, callback: (err: unknown, data?: unknown) => void): void {
    const loader = this.namespaceLoaders.get(namespace);
    if (loader == null) {
      callback(new Error(`No loader for namespace ${namespace}`));
      return;
    }
    Promise.resolve(loader(language))
      .then((data) => {
        if (data != null && typeof data === 'object' && 'default' in data) {
          data = data.default;
        }
        callback(null, data);
      })
      .catch(callback);
  }
}
