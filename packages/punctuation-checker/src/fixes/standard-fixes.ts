import { Diagnostic, DiagnosticFix, Localizer } from '@sillsdev/lynx';

const LOCALIZER_NAMESPACE = 'standardPunctuationFixes';

export class StandardFixProvider {
  constructor(private readonly localizer: Localizer) {}

  public init(): void {
    // Ideally, we'd like to be able to inject an initialization function, so that
    // tests can provide different messages, but due to the way variable dynamic imports
    // work, the namespace loading function can only appear in this file at this location
    if (!this.localizer.hasNamespace(LOCALIZER_NAMESPACE)) {
      this.localizer.addNamespace(
        LOCALIZER_NAMESPACE,
        (language: string) => import(`./locales/${language}.json`, { with: { type: 'json' } }),
      );
    }
  }

  public punctuationRemovalFix(diagnostic: Diagnostic): DiagnosticFix {
    return {
      title: this.localizer.t(`punctuationRemovalFix`, {
        ns: LOCALIZER_NAMESPACE,
      }),
      isPreferred: false,
      diagnostic: diagnostic,
      edits: [
        {
          range: diagnostic.range,
          newText: '',
        },
      ],
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
      edits: [
        {
          range: diagnostic.range,
          newText: replacementCharacter,
        },
      ],
    };
  }
}
