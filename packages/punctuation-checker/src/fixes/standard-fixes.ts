import { Diagnostic, DiagnosticFix, EditFactory, Localizer, ScriptureDocument, TextDocument } from '@sillsdev/lynx';

const LOCALIZER_NAMESPACE = 'standardPunctuationFixes';

class StandardFixProvider<T extends TextDocument | ScriptureDocument> {
  constructor(
    private readonly document: T,
    private readonly editFactory: EditFactory<T>,
    private readonly localizer: Localizer,
  ) {}

  public punctuationRemovalFix(diagnostic: Diagnostic): DiagnosticFix {
    return {
      title: this.localizer.t(`punctuationRemovalFix`, {
        ns: LOCALIZER_NAMESPACE,
      }),
      isPreferred: false,
      diagnostic: diagnostic,
      edits: this.editFactory.createTextEdit(this.document, diagnostic.range, ''),
    };
  }

  public punctuationReplacementFix(diagnostic: Diagnostic, replacementCharacter: string): DiagnosticFix {
    return {
      title: this.localizer.t(`punctuationReplacementFix`, {
        ns: LOCALIZER_NAMESPACE,
        replacementCharacter: replacementCharacter,
      }),
      isPreferred: true,
      diagnostic: diagnostic,
      edits: this.editFactory.createTextEdit(this.document, diagnostic.range, replacementCharacter),
    };
  }
}

class StandardFixProviderFactory<T extends TextDocument | ScriptureDocument> {
  constructor(
    private readonly editFactory: EditFactory<T>,
    private readonly localizer: Localizer,
  ) {}

  public async init(): Promise<void> {
    // Ideally, we'd like to be able to inject an initialization function, so that
    // tests can provide different messages, but due to the way variable dynamic imports
    // work, the namespace loading function can only appear in this file at this location
    if (!this.localizer.hasNamespace(LOCALIZER_NAMESPACE)) {
      this.localizer.addNamespace(
        LOCALIZER_NAMESPACE,
        (language: string) => import(`./locales/${language}.json`, { with: { type: 'json' } }),
      );
    }

    return Promise.resolve();
  }

  public createStandardFixProvider(document: T): StandardFixProvider<T> {
    return new StandardFixProvider(document, this.editFactory, this.localizer);
  }
}

export { type StandardFixProvider, StandardFixProviderFactory };
