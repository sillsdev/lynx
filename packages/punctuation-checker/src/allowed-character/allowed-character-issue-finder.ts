import { Diagnostic, DiagnosticSeverity, Localizer, Range } from '@sillsdev/lynx';

import { CheckableGroup } from '../checkable';
import { DiagnosticFactory } from '../diagnostic-factory';
import { DiagnosticList } from '../diagnostic-list';
import { IssueFinder, IssueFinderFactory } from '../issue-finder';
import { ALLOWED_CHARACTER_CHECKER_LOCALIZER_NAMESPACE } from './allowed-character-checker';
import { AllowedCharacterSet } from './allowed-character-set';

export class AllowedCharacterIssueFinderFactory implements IssueFinderFactory {
  constructor(
    private readonly localizer: Localizer,
    private readonly allowedCharacterSet: AllowedCharacterSet,
  ) {}

  public createIssueFinder(diagnosticFactory: DiagnosticFactory): IssueFinder {
    return new AllowedCharacterIssueFinder(this.localizer, diagnosticFactory, this.allowedCharacterSet);
  }
}

export class AllowedCharacterIssueFinder implements IssueFinder {
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

  public produceDiagnostics(checkableGroup: CheckableGroup): Diagnostic[] {
    this.diagnosticList = new DiagnosticList();

    for (const checkable of checkableGroup) {
      let match: RegExpExecArray | null;
      while ((match = this.characterRegex.exec(checkable.getText()))) {
        const character = match[0];

        this.checkCharacter(character, match.index, match.index + match[0].length, checkable.getEnclosingRange());
      }
    }

    return this.diagnosticList.toArray();
  }

  private checkCharacter(
    character: string,
    characterStartIndex: number,
    characterEndIndex: number,
    enclosingRange?: Range,
  ): void {
    if (!this.allowedCharacterSet.isCharacterAllowed(character)) {
      this.addDisallowedCharacterWarning(character, characterStartIndex, characterEndIndex, enclosingRange);
    }
  }

  private addDisallowedCharacterWarning(
    character: string,
    characterStartIndex: number,
    characterEndIndex: number,
    enclosingRange?: Range,
  ) {
    const code: string = AllowedCharacterIssueFinder.DIAGNOSTIC_CODE;
    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(code)
      .setSeverity(DiagnosticSeverity.Warning)
      .setRange(characterStartIndex, characterEndIndex, enclosingRange)
      .setMessage(
        this.localizer.t(`diagnosticMessagesByCode.${code}`, {
          ns: ALLOWED_CHARACTER_CHECKER_LOCALIZER_NAMESPACE,
          character: character,
        }),
      )
      .build();

    this.diagnosticList.addDiagnostic(diagnostic);
  }
}
