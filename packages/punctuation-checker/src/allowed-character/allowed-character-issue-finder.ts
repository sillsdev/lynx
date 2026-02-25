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

  public async produceDiagnostics(checkableGroup: CheckableGroup): Promise<Diagnostic[]> {
    this.diagnosticList = new DiagnosticList();

    for (const checkable of checkableGroup) {
      let match: RegExpExecArray | null;
      const text = checkable.getText();
      while ((match = this.characterRegex.exec(text))) {
        const character = match[0];

        await this.checkCharacter(
          character,
          match.index,
          match.index + match[0].length,
          checkable.getEnclosingRange(),
          checkable.getVerseRef(),
          checkable.getLeftContext(match.index, 5),
          checkable.getRightContext(match.index + match[0].length, 5),
        );
      }
    }

    return this.diagnosticList.toArray();
  }

  private async checkCharacter(
    character: string,
    characterStartIndex: number,
    characterEndIndex: number,
    enclosingRange: Range | undefined,
    verseRef: string | undefined,
    leftContext: string | undefined,
    rightContext: string | undefined,
  ): Promise<void> {
    if (!this.allowedCharacterSet.isCharacterAllowed(character)) {
      await this.addDisallowedCharacterWarning(
        character,
        characterStartIndex,
        characterEndIndex,
        enclosingRange,
        verseRef,
        leftContext,
        rightContext,
      );
    }
  }

  private async addDisallowedCharacterWarning(
    character: string,
    characterStartIndex: number,
    characterEndIndex: number,
    enclosingRange: Range | undefined,
    verseRef: string | undefined,
    leftContext: string | undefined,
    rightContext: string | undefined,
  ) {
    const code: string = AllowedCharacterIssueFinder.DIAGNOSTIC_CODE;
    const diagnostic: Diagnostic = await this.diagnosticFactory
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
      .setVerseRef(verseRef)
      .setContent(character)
      .setLeftContext(leftContext)
      .setRightContext(rightContext)
      .build();

    this.diagnosticList.addDiagnostic(diagnostic);
  }
}
