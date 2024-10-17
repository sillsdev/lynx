import { Diagnostic, DiagnosticFix, DiagnosticSeverity, DocumentManager, TextDocument } from '@sillsdev/lynx';

import { AbstractChecker } from './abstract-checker';
import { DiagnosticFactory } from './diagnostic-factory';
import { DiagnosticList } from './diagnostic-list';
import { AllowedCharacterSet } from './rule-set/allowed-character-set';

export class AllowedCharacterChecker extends AbstractChecker {
  constructor(
    documentManager: DocumentManager<TextDocument>,
    private readonly allowedCharacterSet: AllowedCharacterSet,
  ) {
    super('allowed-character-set-checker', documentManager);
  }

  protected validateTextDocument(textDocument: TextDocument): Diagnostic[] {
    const diagnosticFactory: DiagnosticFactory = new DiagnosticFactory(this.id, textDocument);

    const allowedCharacterIssueFinder: AllowedCharacterIssueFinder = new AllowedCharacterIssueFinder(
      diagnosticFactory,
      this.allowedCharacterSet,
    );
    return allowedCharacterIssueFinder.produceDiagnostics(textDocument);
  }
  protected getFixes(_textDocument: TextDocument, _diagnostic: Diagnostic): DiagnosticFix[] {
    // no fixes available for disallowed characters
    return [];
  }
}

class AllowedCharacterIssueFinder {
  private diagnosticList: DiagnosticList;

  constructor(
    private readonly diagnosticFactory: DiagnosticFactory,
    private readonly allowedCharacterSet: AllowedCharacterSet,
  ) {
    this.diagnosticList = new DiagnosticList();
  }

  public produceDiagnostics(textDocument: TextDocument): Diagnostic[] {
    this.diagnosticList = new DiagnosticList();

    const text = textDocument.getText();
    for (let characterIndex = 0; characterIndex < text.length; ++characterIndex) {
      const character = text[characterIndex];

      this.checkCharacter(character, characterIndex);
    }

    return this.diagnosticList.toArray();
  }

  private checkCharacter(character: string, characterIndex: number): void {
    if (!this.allowedCharacterSet.isCharacterAllowed(character)) {
      this.addDisallowedCharacterWarning(character, characterIndex);
    }
  }

  private addDisallowedCharacterWarning(character: string, characterIndex: number) {
    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(1)
      .setSeverity(DiagnosticSeverity.Warning)
      .setRange(characterIndex, characterIndex + 1)
      .setMessage(`The character '${character}' is not typically used in this language.`)
      .build();

    this.diagnosticList.addDiagnostic(diagnostic);
  }
}
