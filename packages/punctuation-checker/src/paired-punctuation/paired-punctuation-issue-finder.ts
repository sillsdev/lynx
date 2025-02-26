import { Diagnostic, DiagnosticSeverity, Localizer } from '@sillsdev/lynx';

import { CheckableGroup } from '../checkable';
import { DiagnosticFactory } from '../diagnostic-factory';
import { DiagnosticList } from '../diagnostic-list';
import { IssueFinder, IssueFinderFactory } from '../issue-finder';
import { PairedPunctuationDirection, PairedPunctuationMetadata } from '../utils';
import { OverlappingPairs, PairedPunctuationAnalysis, PairedPunctuationAnalyzer } from './paired-punctuation-analyzer';
import {
  OVERLAPPING_PUNCTUATION_PAIR_DIAGNOSTIC_CODE,
  PAIRED_PUNCTUATION_CHECKER_LOCALIZER_NAMESPACE,
  UNMATCHED_CLOSING_CURLY_BRACKET_DIAGNOSTIC_CODE,
  UNMATCHED_CLOSING_PARENTHESIS_DIAGNOSTIC_CODE,
  UNMATCHED_CLOSING_PUNCTUATION_MARK_DIAGNOSTIC_CODE,
  UNMATCHED_CLOSING_SQUARE_BRACKET_DIAGNOSTIC_CODE,
  UNMATCHED_OPENING_CURLY_BRACKET_DIAGNOSTIC_CODE,
  UNMATCHED_OPENING_PARENTHESIS_DIAGNOSTIC_CODE,
  UNMATCHED_OPENING_PUNCTUATION_MARK_DIAGNOSTIC_CODE,
  UNMATCHED_OPENING_SQUARE_BRACKET_DIAGNOSTIC_CODE,
} from './paired-punctuation-checker';
import { PairedPunctuationConfig } from './paired-punctuation-config';

export class PairedPunctuationIssueFinderFactory implements IssueFinderFactory {
  constructor(
    private readonly localizer: Localizer,
    private readonly pairedPunctuationConfig: PairedPunctuationConfig,
  ) {}

  public createIssueFinder(diagnosticFactory: DiagnosticFactory): IssueFinder {
    return new PairedPunctuationIssueFinder(this.localizer, this.pairedPunctuationConfig, diagnosticFactory);
  }
}

export class PairedPunctuationIssueFinder implements IssueFinder {
  private diagnosticList: DiagnosticList;

  constructor(
    private readonly localizer: Localizer,
    private readonly pairedPunctuationConfig: PairedPunctuationConfig,
    private readonly diagnosticFactory: DiagnosticFactory,
  ) {
    this.diagnosticList = new DiagnosticList();
  }

  private reset(): void {
    this.diagnosticList = new DiagnosticList();
  }

  public produceDiagnostics(checkableGroup: CheckableGroup): Diagnostic[] {
    this.reset();
    const pairedPunctuationAnalyzer: PairedPunctuationAnalyzer = new PairedPunctuationAnalyzer(
      this.pairedPunctuationConfig,
    );
    const analysis: PairedPunctuationAnalysis = pairedPunctuationAnalyzer.analyze(checkableGroup);

    this.createDiagnostics(analysis);
    return this.diagnosticList.toArray();
  }

  private createDiagnostics(analysis: PairedPunctuationAnalysis): void {
    this.createUnmatchedPunctuationDiagnostics(analysis);
    this.createOverlappingPunctuationDiagnostics(analysis);
  }

  private createUnmatchedPunctuationDiagnostics(analysis: PairedPunctuationAnalysis): void {
    for (const unmatchedQuote of analysis.getUnmatchedPunctuationMarks()) {
      this.addUnmatchedPunctuationMarkError(unmatchedQuote);
    }
  }

  private createOverlappingPunctuationDiagnostics(analysis: PairedPunctuationAnalysis): void {
    for (const overlappingPunctuation of analysis.getOverlappingPunctuationMarks()) {
      this.addOverlappingPunctuationWarning(overlappingPunctuation);
    }
  }

  private addUnmatchedPunctuationMarkError(punctuationMark: PairedPunctuationMetadata): void {
    const code: string = this.getUnmatchedErrorCode(punctuationMark);
    const message: string = this.getUnmatchedErrorMessage(code);

    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(code)
      .setSeverity(DiagnosticSeverity.Error)
      .setRange(punctuationMark.startIndex, punctuationMark.endIndex, punctuationMark.enclosingRange)
      .setMessage(message)
      .build();
    this.diagnosticList.addDiagnostic(diagnostic);
  }

  private getUnmatchedErrorCode(punctuationMark: PairedPunctuationMetadata): string {
    if (punctuationMark.direction === PairedPunctuationDirection.Opening) {
      if (punctuationMark.text === '(') {
        return UNMATCHED_OPENING_PARENTHESIS_DIAGNOSTIC_CODE;
      } else if (punctuationMark.text === '[') {
        return UNMATCHED_OPENING_SQUARE_BRACKET_DIAGNOSTIC_CODE;
      } else if (punctuationMark.text === '{') {
        return UNMATCHED_OPENING_CURLY_BRACKET_DIAGNOSTIC_CODE;
      } else {
        return UNMATCHED_OPENING_PUNCTUATION_MARK_DIAGNOSTIC_CODE;
      }
    } else {
      if (punctuationMark.text === ')') {
        return UNMATCHED_CLOSING_PARENTHESIS_DIAGNOSTIC_CODE;
      } else if (punctuationMark.text === ']') {
        return UNMATCHED_CLOSING_SQUARE_BRACKET_DIAGNOSTIC_CODE;
      } else if (punctuationMark.text === '}') {
        return UNMATCHED_CLOSING_CURLY_BRACKET_DIAGNOSTIC_CODE;
      } else {
        return UNMATCHED_CLOSING_PUNCTUATION_MARK_DIAGNOSTIC_CODE;
      }
    }
  }

  private getUnmatchedErrorMessage(errorCode: string): string {
    return this.localizer.t(`diagnosticMessagesByCode.${errorCode}`, {
      ns: PAIRED_PUNCTUATION_CHECKER_LOCALIZER_NAMESPACE,
    });
  }

  private addOverlappingPunctuationWarning(overlappingPairs: OverlappingPairs): void {
    this.addFirstOverlappingPairWarning(overlappingPairs);
    this.addSecondOverlappingPairWarning(overlappingPairs);
  }

  private addFirstOverlappingPairWarning(overlappingPairs: OverlappingPairs): void {
    const code: string = OVERLAPPING_PUNCTUATION_PAIR_DIAGNOSTIC_CODE;

    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(code)
      .setSeverity(DiagnosticSeverity.Warning)
      .setRange(
        overlappingPairs.getOpeningMark().startIndex,
        overlappingPairs.getOpeningMark().endIndex,
        overlappingPairs.getOpeningMark().enclosingRange,
      )
      .setMessage(
        this.createOverlappingPairMessage(code, overlappingPairs.getOpeningMark(), overlappingPairs.getClosingMark()),
      )
      .build();

    this.diagnosticList.addDiagnostic(diagnostic);
  }

  private addSecondOverlappingPairWarning(overlappingPairs: OverlappingPairs): void {
    const code: string = OVERLAPPING_PUNCTUATION_PAIR_DIAGNOSTIC_CODE;

    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(code)
      .setSeverity(DiagnosticSeverity.Warning)
      .setRange(
        overlappingPairs.getClosingMark().startIndex,
        overlappingPairs.getClosingMark().endIndex,
        overlappingPairs.getClosingMark().enclosingRange,
      )
      .setMessage(
        this.createOverlappingPairMessage(code, overlappingPairs.getClosingMark(), overlappingPairs.getOpeningMark()),
      )
      .build();

    this.diagnosticList.addDiagnostic(diagnostic);
  }

  private createOverlappingPairMessage(
    errorCode: string,
    focusedPunctuationMark: PairedPunctuationMetadata,
    otherPunctuationMark: PairedPunctuationMetadata,
  ): string {
    return this.localizer.t(`diagnosticMessagesByCode.${errorCode}`, {
      ns: PAIRED_PUNCTUATION_CHECKER_LOCALIZER_NAMESPACE,
      firstPair: this.createExemplaryPunctuationPairStr(focusedPunctuationMark),
      secondPair: this.createExemplaryPunctuationPairStr(otherPunctuationMark),
    });
  }

  private createExemplaryPunctuationPairStr(punctuationMark: PairedPunctuationMetadata): string {
    const correspondingMark: string | undefined = this.pairedPunctuationConfig.findCorrespondingMark(
      punctuationMark.text,
    );
    if (correspondingMark === undefined) {
      throw new Error(
        'Attempted to find the corresponding punctuation mark of a character that is not in the PairedPunctuationConfig',
      );
    }
    if (punctuationMark.direction === PairedPunctuationDirection.Opening) {
      return punctuationMark.text + '\u2026' + correspondingMark;
    } else {
      return correspondingMark + '\u2026' + punctuationMark.text;
    }
  }
}
