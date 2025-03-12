import {
  Diagnostic,
  DiagnosticFix,
  EditFactory,
  Localizer,
  Range,
  ScriptureDocument,
  TextDocument,
  TextEdit,
} from '@sillsdev/lynx';

const LOCALIZER_NAMESPACE = 'standardPunctuationFixes';

class StandardFixProvider<TDoc extends TextDocument | ScriptureDocument, TEdit = TextEdit> {
  constructor(
    private readonly document: TDoc,
    private readonly editFactory: EditFactory<TDoc, TEdit>,
    private readonly localizer: Localizer,
  ) {}

  public punctuationRemovalFix(diagnostic: Diagnostic): DiagnosticFix<TEdit> {
    return {
      title: this.localizer.t(`punctuationRemovalFix`, {
        ns: LOCALIZER_NAMESPACE,
      }),
      isPreferred: false,
      diagnostic: diagnostic,
      edits: this.editFactory.createTextEdit(this.document, diagnostic.range, ''),
    };
  }

  public punctuationReplacementFix(diagnostic: Diagnostic, replacementCharacter: string): DiagnosticFix<TEdit> {
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

  public leadingSpaceInsertionFix(diagnostic: Diagnostic): DiagnosticFix<TEdit> {
    return {
      title: this.localizer.t(`leadingSpaceInsertionFix`, {
        ns: LOCALIZER_NAMESPACE,
      }),
      isPreferred: true,
      diagnostic: diagnostic,
      edits: this.editFactory.createTextEdit(
        this.document,
        this.getRangeForLeadingCharacterInsertion(diagnostic.range),
        ' ',
      ),
    };
  }

  private getRangeForLeadingCharacterInsertion(range: Range): Range {
    return {
      start: {
        line: range.start.line,
        character: range.start.character,
      },
      end: {
        line: range.start.line,
        character: range.start.character,
      },
    };
  }

  public trailingSpaceInsertionFix(diagnostic: Diagnostic): DiagnosticFix<TEdit> {
    return {
      title: this.localizer.t(`trailingSpaceInsertionFix`, {
        ns: LOCALIZER_NAMESPACE,
      }),
      isPreferred: true,
      diagnostic: diagnostic,
      edits: this.editFactory.createTextEdit(
        this.document,
        this.getRangeForTrailingCharacterInsertion(diagnostic.range),
        ' ',
      ),
    };
  }

  private getRangeForTrailingCharacterInsertion(range: Range): Range {
    return {
      start: {
        line: range.end.line,
        character: range.end.character,
      },
      end: {
        line: range.end.line,
        character: range.end.character,
      },
    };
  }
}

class StandardFixProviderFactory<TDoc extends TextDocument | ScriptureDocument, TEdit = TextEdit> {
  constructor(
    private readonly editFactory: EditFactory<TDoc, TEdit>,
    private readonly localizer: Localizer,
  ) {}

  public async init(): Promise<void> {
    // Ideally, we'd like to be able to inject an initialization function, so that
    // tests can provide different messages, but due to the way variable dynamic imports
    // work, the namespace loading function can only appear in this file at this location
    this.localizer.addNamespace(
      LOCALIZER_NAMESPACE,
      (language: string) => import(`./locales/${language}.json`, { with: { type: 'json' } }),
    );

    return Promise.resolve();
  }

  public createStandardFixProvider(document: TDoc): StandardFixProvider<TDoc, TEdit> {
    return new StandardFixProvider(document, this.editFactory, this.localizer);
  }
}

export { type StandardFixProvider, StandardFixProviderFactory };
