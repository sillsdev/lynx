import {
  Diagnostic,
  DiagnosticFix,
  DiagnosticSeverity,
  DocumentManager,
  Localizer,
  TextDocument,
} from '@sillsdev/lynx';

import { AbstractChecker } from '../abstract-checker';
import { DiagnosticFactory } from '../diagnostic-factory';
import { DiagnosticList } from '../diagnostic-list';
import { AllowedCharacterSet } from './allowed-character-set';

const LOCALIZER_NAMESPACE = 'allowedCharacters';

export class AllowedCharacterChecker extends AbstractChecker {
  constructor(
    localizer: Localizer,
    documentManager: DocumentManager<TextDocument>,
    private readonly allowedCharacterSet: AllowedCharacterSet,
  ) {
    super('allowed-character-set-checker', localizer, documentManager);
  }

  async init(): Promise<void> {
    await super.init();

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

  protected validateTextDocument(textDocument: TextDocument): Diagnostic[] {
    const diagnosticFactory: DiagnosticFactory = new DiagnosticFactory(this.id, textDocument);

    const allowedCharacterIssueFinder: AllowedCharacterIssueFinder = new AllowedCharacterIssueFinder(
      this.localizer,
      diagnosticFactory,
      this.allowedCharacterSet,
    );
    return allowedCharacterIssueFinder.produceDiagnostics(textDocument.getText());
  }
  protected getFixes(_textDocument: TextDocument, _diagnostic: Diagnostic): DiagnosticFix[] {
    // no fixes available for disallowed characters
    return [];
  }
}

class AllowedCharacterIssueFinder {
  private diagnosticList: DiagnosticList;
  private readonly characterRegex: RegExp = /./gu;
  private static readonly DIAGNOSTIC_CODE: string = 'disallowed-character';

  constructor(
    private readonly localizer: Localizer,
    private readonly diagnosticFactory: DiagnosticFactory,
    private readonly allowedCharacterSet: AllowedCharacterSet,
  ) {
    this.diagnosticList = new DiagnosticList();
  }

  public produceDiagnostics(text: string): Diagnostic[] {
    this.diagnosticList = new DiagnosticList();

    let match: RegExpExecArray | null;
    while ((match = this.characterRegex.exec(text))) {
      const character = match[0];

      this.checkCharacter(character, match.index, match.index + match[0].length);
    }

    return this.diagnosticList.toArray();
  }

  private checkCharacter(character: string, characterStartIndex: number, characterEndIndex: number): void {
    if (!this.allowedCharacterSet.isCharacterAllowed(character)) {
      this.addDisallowedCharacterWarning(character, characterStartIndex, characterEndIndex);
    }
  }

  private addDisallowedCharacterWarning(character: string, characterStartIndex: number, characterEndIndex: number) {
    const code: string = AllowedCharacterIssueFinder.DIAGNOSTIC_CODE;
    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(code)
      .setSeverity(DiagnosticSeverity.Warning)
      .setRange(characterStartIndex, characterEndIndex)
      .setMessage(
        this.localizer.t(`diagnosticMessagesByCode.${code}`, {
          ns: LOCALIZER_NAMESPACE,
          character: character,
        }),
      )
      .build();

    this.diagnosticList.addDiagnostic(diagnostic);
  }
}

export const _privateTestingClasses = {
  AllowedCharacterIssueFinder,
};
