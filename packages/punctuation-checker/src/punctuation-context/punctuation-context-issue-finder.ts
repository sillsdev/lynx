import { Diagnostic, DiagnosticSeverity, Localizer, Range } from '@sillsdev/lynx';

import { Checkable, CheckableGroup } from '../checkable';
import { DiagnosticFactory } from '../diagnostic-factory';
import { DiagnosticList } from '../diagnostic-list';
import { IssueFinder, IssueFinderFactory } from '../issue-finder';
import {
  LEADING_CONTEXT_DIAGNOSTIC_CODE,
  PUNCTUATION_CONTEXT_CHECKER_LOCALIZER_NAMESPACE,
  TRAILING_CONTEXT_DIAGNOSTIC_CODE,
} from './punctuation-context-checker';
import { PunctuationContextConfig } from './punctuation-context-config';

class PunctuationContextIssueFinderFactory implements IssueFinderFactory {
  constructor(
    private readonly localizer: Localizer,
    private readonly whitespaceConfig: PunctuationContextConfig,
  ) {}

  public createIssueFinder(diagnosticFactory: DiagnosticFactory): PunctuationContextIssueFinder {
    return new PunctuationContextIssueFinder(this.localizer, diagnosticFactory, this.whitespaceConfig);
  }
}

class PunctuationContextIssueFinder implements IssueFinder {
  private diagnosticList: DiagnosticList;
  private punctuationRegex: RegExp;

  constructor(
    private readonly localizer: Localizer,
    private readonly diagnosticFactory: DiagnosticFactory,
    private readonly whitespaceConfig: PunctuationContextConfig,
  ) {
    this.punctuationRegex = this.whitespaceConfig.createPunctuationRegex();
    this.diagnosticList = new DiagnosticList();
  }

  public async produceDiagnostics(checkableGroup: CheckableGroup): Promise<Diagnostic[]> {
    this.diagnosticList = new DiagnosticList();

    for (const checkable of checkableGroup) {
      await this.processCheckable(checkable);
    }

    return this.diagnosticList.toArray();
  }

  private async processCheckable(checkable: Checkable): Promise<void> {
    let match: RegExpExecArray | null;
    while ((match = this.punctuationRegex.exec(checkable.getText()))) {
      const punctuationMark = match[0];

      await this.checkWhitespaceAroundPunctuationMark(
        punctuationMark,
        checkable.getLeftContext(match.index, 5),
        checkable.getRightContext(match.index + match[0].length, 5),
        match.index,
        match.index + match[0].length,
        checkable.getEnclosingRange(),
        checkable.getVerseRef(),
      );
    }
  }

  private async checkWhitespaceAroundPunctuationMark(
    punctuationMark: string,
    leftContext: string,
    rightContext: string,
    characterStartIndex: number,
    characterEndIndex: number,
    enclosingRange: Range | undefined,
    verseRef: string | undefined,
  ): Promise<void> {
    if (!this.whitespaceConfig.isLeadingContextCorrect(punctuationMark, leftContext.charAt(leftContext.length - 1))) {
      await this.addIncorrectLeadingWhitespaceWarning(
        punctuationMark,
        leftContext,
        rightContext,
        characterStartIndex,
        characterEndIndex,
        enclosingRange,
        verseRef,
      );
    }
    if (!this.whitespaceConfig.isTrailingContextCorrect(punctuationMark, rightContext.charAt(0))) {
      await this.addIncorrectTrailingWhitespaceWarning(
        punctuationMark,
        leftContext,
        rightContext,
        characterStartIndex,
        characterEndIndex,
        enclosingRange,
        verseRef,
      );
    }
  }

  private async addIncorrectLeadingWhitespaceWarning(
    character: string,
    leftContext: string,
    rightContext: string,
    characterStartIndex: number,
    characterEndIndex: number,
    enclosingRange: Range | undefined,
    verseRef: string | undefined,
  ) {
    const code: string = LEADING_CONTEXT_DIAGNOSTIC_CODE;
    const diagnostic: Diagnostic = await this.diagnosticFactory
      .newBuilder()
      .setCode(code)
      .setSeverity(DiagnosticSeverity.Warning)
      .setRange(characterStartIndex, characterEndIndex, enclosingRange)
      .setMessage(
        this.localizer.t(`diagnosticMessagesByCode.${code}`, {
          ns: PUNCTUATION_CONTEXT_CHECKER_LOCALIZER_NAMESPACE,
          punctuationMark: character,
          precedingCharacter: leftContext.charAt(leftContext.length - 1),
        }),
      )
      .setData({
        isSpaceAllowed: this.whitespaceConfig.isLeadingContextCorrect(character, ' '),
      } as WhitespaceDiagnosticData)
      .setVerseRef(verseRef)
      .setContent(character)
      .setLeftContext(leftContext)
      .setRightContext(rightContext)
      .build();

    this.diagnosticList.addDiagnostic(diagnostic);
  }

  private async addIncorrectTrailingWhitespaceWarning(
    character: string,
    leftContext: string,
    rightContext: string,
    characterStartIndex: number,
    characterEndIndex: number,
    enclosingRange: Range | undefined,
    verseRef: string | undefined,
  ) {
    const code: string = TRAILING_CONTEXT_DIAGNOSTIC_CODE;
    const diagnostic: Diagnostic = await this.diagnosticFactory
      .newBuilder()
      .setCode(code)
      .setSeverity(DiagnosticSeverity.Warning)
      .setRange(characterStartIndex, characterEndIndex, enclosingRange)
      .setMessage(
        this.localizer.t(`diagnosticMessagesByCode.${code}`, {
          ns: PUNCTUATION_CONTEXT_CHECKER_LOCALIZER_NAMESPACE,
          punctuationMark: character,
          followingCharacter: rightContext.charAt(0),
        }),
      )
      .setData({
        isSpaceAllowed: this.whitespaceConfig.isTrailingContextCorrect(character, ' '),
      } as WhitespaceDiagnosticData)
      .setVerseRef(verseRef)
      .setContent(character)
      .setLeftContext(leftContext)
      .setRightContext(rightContext)
      .build();

    this.diagnosticList.addDiagnostic(diagnostic);
  }
}

interface WhitespaceDiagnosticData {
  isSpaceAllowed: boolean;
}

export { type PunctuationContextIssueFinder, PunctuationContextIssueFinderFactory, WhitespaceDiagnosticData };
