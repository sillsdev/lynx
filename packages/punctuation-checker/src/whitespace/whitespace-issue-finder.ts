import { Diagnostic, DiagnosticSeverity, Localizer, Range, ScriptureNode } from '@sillsdev/lynx';

import { DiagnosticFactory } from '../diagnostic-factory';
import { DiagnosticList } from '../diagnostic-list';
import { IssueFinder, IssueFinderFactory } from '../issue-finder';
import { ScriptureNodeGroup } from '../utils';
import { WHITESPACE_CHECKER_LOCALIZER_NAMESPACE } from './whitespace-checker';
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
  private static readonly LEADING_WHITESPACE_DIAGNOSTIC_CODE: string = 'incorrect-leading-whitespace';
  private static readonly TRAILING_WHITESPACE_DIAGNOSTIC_CODE: string = 'incorrect-trailing-whitespace';

  constructor(
    private readonly localizer: Localizer,
    private readonly diagnosticFactory: DiagnosticFactory,
    private readonly whitespaceConfig: WhitespaceConfig,
  ) {
    this.punctuationRegex = this.whitespaceConfig.createPunctuationRegex();
    this.diagnosticList = new DiagnosticList();
  }

  public produceDiagnostics(input: string): Diagnostic[] {
    this.diagnosticList = new DiagnosticList();

    let match: RegExpExecArray | null;
    while ((match = this.punctuationRegex.exec(input))) {
      const punctuationMark = match[0];

      const leftContext = this.getLeftContextForMatch(input, match);
      const rightContext = this.getRightContextForMatch(input, match);
      this.checkWhitespaceAroundPunctuationMark(
        punctuationMark,
        leftContext,
        rightContext,
        match.index,
        match.index + match[0].length,
      );
    }

    return this.diagnosticList.toArray();
  }

  private getLeftContextForMatch(text: string, match: RegExpExecArray): string {
    return text.substring(Math.max(0, match.index - 1), match.index);
  }

  private getRightContextForMatch(text: string, match: RegExpExecArray): string {
    return text.substring(match.index + match[0].length, Math.min(text.length, match.index + match[0].length + 1));
  }

  public produceDiagnosticsForScripture(nodes: ScriptureNode | ScriptureNodeGroup): Diagnostic[] {
    this.diagnosticList = new DiagnosticList();

    if (!(nodes instanceof ScriptureNodeGroup)) {
      nodes = ScriptureNodeGroup.createFromNodes([nodes]);
    }

    for (let nodeIndex = 0; nodeIndex < nodes.size(); ++nodeIndex) {
      const currentNode: ScriptureNode = nodes.nodeAtIndex(nodeIndex);
      const previousNode: ScriptureNode | undefined = nodeIndex > 0 ? nodes.nodeAtIndex(nodeIndex - 1) : undefined;
      const nextNode: ScriptureNode | undefined =
        nodeIndex < nodes.size() - 1 ? nodes.nodeAtIndex(nodeIndex + 1) : undefined;

      let match: RegExpExecArray | null;
      while ((match = this.punctuationRegex.exec(currentNode.getText()))) {
        const punctuationMark = match[0];

        const leftContext = this.getLeftContextForNodeMatch(currentNode, previousNode, match);
        const rightContext = this.getRightContextForNodeMatch(currentNode, nextNode, match);
        this.checkWhitespaceAroundPunctuationMark(
          punctuationMark,
          leftContext,
          rightContext,
          match.index,
          match.index + match[0].length,
          currentNode.range,
        );
      }
    }

    return this.diagnosticList.toArray();
  }

  // The USFM parser removes whitespace from either side of a paragraph marker
  private getLeftContextForNodeMatch(
    currentNode: ScriptureNode,
    previousNode: ScriptureNode | undefined,
    match: RegExpExecArray,
  ): string {
    if (match.index === 0 && previousNode !== undefined) {
      return previousNode.getText().substring(previousNode.getText().length - 1);
    }
    return currentNode.getText().substring(Math.max(0, match.index - 1), match.index);
  }

  private getRightContextForNodeMatch(
    currentNode: ScriptureNode,
    nextNode: ScriptureNode | undefined,
    match: RegExpExecArray,
  ): string {
    if (match.index === currentNode.getText().length - 1 && nextNode !== undefined) {
      return nextNode.getText().substring(0, 1);
    }
    return currentNode
      .getText()
      .substring(
        match.index + match[0].length,
        Math.min(currentNode.getText().length, match.index + match[0].length + 1),
      );
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
        characterStartIndex,
        characterEndIndex,
        enclosingRange,
      );
    }
    if (!this.whitespaceConfig.isTrailingWhitespaceCorrect(punctuationMark, rightContext)) {
      this.addIncorrectTrailingWhitespaceWarning(
        punctuationMark,
        characterStartIndex,
        characterEndIndex,
        enclosingRange,
      );
    }
  }

  private addIncorrectLeadingWhitespaceWarning(
    character: string,
    characterStartIndex: number,
    characterEndIndex: number,
    enclosingRange?: Range,
  ) {
    const code: string = WhitespaceIssueFinder.LEADING_WHITESPACE_DIAGNOSTIC_CODE;
    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(code)
      .setSeverity(DiagnosticSeverity.Warning)
      .setRange(characterStartIndex, characterEndIndex, enclosingRange)
      .setMessage(
        this.localizer.t(`diagnosticMessagesByCode.${code}`, {
          ns: WHITESPACE_CHECKER_LOCALIZER_NAMESPACE,
          character: character,
        }),
      )
      .build();

    this.diagnosticList.addDiagnostic(diagnostic);
  }

  private addIncorrectTrailingWhitespaceWarning(
    character: string,
    characterStartIndex: number,
    characterEndIndex: number,
    enclosingRange?: Range,
  ) {
    const code: string = WhitespaceIssueFinder.TRAILING_WHITESPACE_DIAGNOSTIC_CODE;
    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(code)
      .setSeverity(DiagnosticSeverity.Warning)
      .setRange(characterStartIndex, characterEndIndex, enclosingRange)
      .setMessage(
        this.localizer.t(`diagnosticMessagesByCode.${code}`, {
          ns: WHITESPACE_CHECKER_LOCALIZER_NAMESPACE,
          character: character,
        }),
      )
      .build();

    this.diagnosticList.addDiagnostic(diagnostic);
  }
}

export { type WhitespaceIssueFinder, WhitespaceIssueFinderFactory };
