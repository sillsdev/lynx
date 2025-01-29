import { Diagnostic, DiagnosticSeverity, Localizer, Range } from '@sillsdev/lynx';

import { Checkable, CheckableGroup } from '../checkable';
import { DiagnosticFactory } from '../diagnostic-factory';
import { DiagnosticList } from '../diagnostic-list';
import { IssueFinder, IssueFinderFactory } from '../issue-finder';
import {
  LEADING_WHITESPACE_DIAGNOSTIC_CODE,
  TRAILING_WHITESPACE_DIAGNOSTIC_CODE,
  WHITESPACE_CHECKER_LOCALIZER_NAMESPACE,
} from './whitespace-checker';
import { WhitespaceConfig } from './whitespace-config';

class WhitespaceIssueFinderFactory implements IssueFinderFactory {
  constructor(
    private readonly localizer: Localizer,
    private readonly whitespaceConfig: WhitespaceConfig,
  ) {}

  public createIssueFinder(diagnosticFactory: DiagnosticFactory): WhitespaceIssueFinder {
    return new WhitespaceIssueFinder(this.localizer, diagnosticFactory, this.whitespaceConfig);
  }
}

class WhitespaceIssueFinder implements IssueFinder {
  private diagnosticList: DiagnosticList;
  private punctuationRegex: RegExp;

  constructor(
    private readonly localizer: Localizer,
    private readonly diagnosticFactory: DiagnosticFactory,
    private readonly whitespaceConfig: WhitespaceConfig,
  ) {
    this.punctuationRegex = this.whitespaceConfig.createPunctuationRegex();
    this.diagnosticList = new DiagnosticList();
  }

  public produceDiagnostics(checkableGroup: CheckableGroup): Diagnostic[] {
    this.diagnosticList = new DiagnosticList();

    for (const checkable of checkableGroup) {
      let match: RegExpExecArray | null;
      while ((match = this.punctuationRegex.exec(checkable.getText()))) {
        const punctuationMark = match[0];

        const leftContext = this.getLeftContextForMatch(checkable, match);
        const rightContext = this.getRightContextForMatch(checkable, match);
        this.checkWhitespaceAroundPunctuationMark(
          punctuationMark,
          leftContext,
          rightContext,
          match.index,
          match.index + match[0].length,
          checkable.getEnclosingRange(),
        );
      }
    }

    return this.diagnosticList.toArray();
  }

  private getLeftContextForMatch(checkable: Checkable, match: RegExpExecArray): string {
    if (match.index === 0) {
      return this.getLastCharacterOfPreviousNode(checkable);
    }
    return checkable.getText().substring(Math.max(0, match.index - 1), match.index);
  }

  private getLastCharacterOfPreviousNode(checkable: Checkable): string {
    const previous: Checkable | undefined = checkable.previous();
    if (
      previous === undefined ||
      checkable.isLeadingWhitespacePossiblyTruncated() ||
      previous.isTrailingWhitespacePossiblyTruncated()
    ) {
      return '';
    }
    if (previous.getText().length === 0) {
      return this.getLastCharacterOfPreviousNode(previous);
    }
    return previous.getText().substring(previous.getText().length - 1);
  }

  private getRightContextForMatch(checkable: Checkable, match: RegExpExecArray): string {
    if (match.index === checkable.getText().length - 1) {
      return this.getFirstCharacterOfNextNode(checkable);
    }
    return checkable
      .getText()
      .substring(
        match.index + match[0].length,
        Math.min(checkable.getText().length, match.index + match[0].length + 1),
      );
  }

  private getFirstCharacterOfNextNode(checkable: Checkable): string {
    const next: Checkable | undefined = checkable.next();
    if (
      next === undefined ||
      checkable.isTrailingWhitespacePossiblyTruncated() ||
      next.isLeadingWhitespacePossiblyTruncated()
    ) {
      return '';
    }
    if (next.getText().length === 0) {
      return this.getFirstCharacterOfNextNode(next);
    }
    return next.getText().substring(0, 1);
  }

  private checkWhitespaceAroundPunctuationMark(
    punctuationMark: string,
    leftContext: string,
    rightContext: string,
    characterStartIndex: number,
    characterEndIndex: number,
    enclosingRange?: Range,
  ): void {
    if (!this.whitespaceConfig.isLeadingWhitespaceCorrect(punctuationMark, leftContext)) {
      this.addIncorrectLeadingWhitespaceWarning(
        punctuationMark,
        leftContext,
        characterStartIndex,
        characterEndIndex,
        enclosingRange,
      );
    }
    if (!this.whitespaceConfig.isTrailingWhitespaceCorrect(punctuationMark, rightContext)) {
      this.addIncorrectTrailingWhitespaceWarning(
        punctuationMark,
        rightContext,
        characterStartIndex,
        characterEndIndex,
        enclosingRange,
      );
    }
  }

  private addIncorrectLeadingWhitespaceWarning(
    character: string,
    leftContext: string,
    characterStartIndex: number,
    characterEndIndex: number,
    enclosingRange?: Range,
  ) {
    const code: string = LEADING_WHITESPACE_DIAGNOSTIC_CODE;
    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(code)
      .setSeverity(DiagnosticSeverity.Warning)
      .setRange(characterStartIndex, characterEndIndex, enclosingRange)
      .setMessage(
        this.localizer.t(`diagnosticMessagesByCode.${code}`, {
          ns: WHITESPACE_CHECKER_LOCALIZER_NAMESPACE,
          punctuationMark: character,
          precedingCharacter: leftContext,
        }),
      )
      .setData({
        isSpaceAllowed: this.whitespaceConfig.getAllowableLeadingWhitespaceCharacters(character).isCharacterInSet(' '),
      } as WhitespaceDiagnosticData)
      .build();

    this.diagnosticList.addDiagnostic(diagnostic);
  }

  private addIncorrectTrailingWhitespaceWarning(
    character: string,
    rightContext: string,
    characterStartIndex: number,
    characterEndIndex: number,
    enclosingRange?: Range,
  ) {
    const code: string = TRAILING_WHITESPACE_DIAGNOSTIC_CODE;
    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(code)
      .setSeverity(DiagnosticSeverity.Warning)
      .setRange(characterStartIndex, characterEndIndex, enclosingRange)
      .setMessage(
        this.localizer.t(`diagnosticMessagesByCode.${code}`, {
          ns: WHITESPACE_CHECKER_LOCALIZER_NAMESPACE,
          punctuationMark: character,
          followingCharacter: rightContext,
        }),
      )
      .setData({
        isSpaceAllowed: this.whitespaceConfig.getAllowableTrailingWhitespaceCharacters(character).isCharacterInSet(' '),
      } as WhitespaceDiagnosticData)
      .build();

    this.diagnosticList.addDiagnostic(diagnostic);
  }
}

interface WhitespaceDiagnosticData {
  isSpaceAllowed: boolean;
}

export { WhitespaceDiagnosticData, type WhitespaceIssueFinder, WhitespaceIssueFinderFactory };
