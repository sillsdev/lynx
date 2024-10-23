import { Diagnostic, DiagnosticFix, DiagnosticSeverity, DocumentManager } from 'lynx-core';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { AbstractChecker, BasicCheckerConfig } from './abstract-checker';
import { DiagnosticFactory } from './diagnostic-factory';
import { DiagnosticList } from './diagnostic-list';
import { AllowedCharacterSet } from './rule-set/allowed-character-set';

export class AllowedCharacterChecker extends AbstractChecker {
  constructor(
    documentManager: DocumentManager<TextDocument>,
    config: () => BasicCheckerConfig,
    private readonly allowedCharacterSet: AllowedCharacterSet,
  ) {
    super('allowed-character-set-checker', documentManager, config);
  }

  protected validateTextDocument(textDocument: TextDocument): Diagnostic[] {
    const settings: BasicCheckerConfig = this.config();
    const diagnosticFactory: DiagnosticFactory = new DiagnosticFactory(this.id, textDocument);

    const allowedCharacterIssueFinder: AllowedCharacterIssueFinder = new AllowedCharacterIssueFinder(
      settings,
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
    private readonly settings: BasicCheckerConfig,
    private readonly diagnosticFactory: DiagnosticFactory,
    private readonly allowedCharacterSet: AllowedCharacterSet,
  ) {
    this.diagnosticList = new DiagnosticList(settings);
  }

  public produceDiagnostics(text: string): Diagnostic[] {
    this.diagnosticList = new DiagnosticList(this.settings);

    // TODO: convert to a standard Unicode format like NFKC
    let match: RegExpExecArray | null;
    while ((match = this.characterRegex.exec(text))) {
      const character = match[0];

      this.checkCharacter(character, match.index, match.index + match[0].length);
      if (this.diagnosticList.isProblemThresholdReached()) {
        break;
      }
    }

    return this.diagnosticList.toArray();
  }

  private checkCharacter(character: string, characterStartIndex: number, characterEndIndex: number): void {
    if (!this.allowedCharacterSet.isCharacterAllowed(character)) {
      this.addDisallowedCharacterWarning(character, characterStartIndex, characterEndIndex);
    }
  }

  private addDisallowedCharacterWarning(character: string, characterStartIndex: number, characterEndIndex: number) {
    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(AllowedCharacterIssueFinder.DIAGNOSTIC_CODE)
      .setSeverity(DiagnosticSeverity.Warning)
      .setRange(characterStartIndex, characterEndIndex)
      .setMessage(`The character '${character}' is not typically used in this language.`)
      .build();

    this.diagnosticList.addDiagnostic(diagnostic);
  }
}

export const _privateTestingClasses = {
  AllowedCharacterIssueFinder,
};
