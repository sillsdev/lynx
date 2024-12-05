import { Diagnostic, DiagnosticFix, DiagnosticSeverity, DocumentManager, TextDocument } from '@sillsdev/lynx';

import { AbstractChecker } from '../abstract-checker';
import { DiagnosticFactory } from '../diagnostic-factory';
import { DiagnosticList } from '../diagnostic-list';
import { StandardFixes } from '../standard-fixes';
import { PairedPunctuationDirection, PairedPunctuationMetadata } from '../utils';
import { PairedPunctuationConfig } from './paired-punctuation-config';

const UNMATCHED_OPENING_PARENTHESIS_DIAGNOSTIC_CODE = 'unmatched-opening-parenthesis';
const UNMATCHED_OPENING_PARENTHESIS_MESSAGE = 'Opening parenthesis with no closing parenthesis.';

const UNMATCHED_CLOSING_PARENTHESIS_DIAGNOSTIC_CODE = 'unmatched-closing-parenthesis';
const UNMATCHED_CLOSING_PARENTHESIS_MESSAGE = 'Closing parenthesis with no opening parenthesis.';

const UNMATCHED_OPENING_SQUARE_BRACKET_DIAGNOSTIC_CODE = 'unmatched-opening-square-bracket';
const UNMATCHED_OPENING_SQUARE_BRACKET_MESSAGE = 'Opening square bracket with no closing bracket.';

const UNMATCHED_CLOSING_SQUARE_BRACKET_DIAGNOSTIC_CODE = 'unmatched-closing-square-bracket';
const UNMATCHED_CLOSING_SQUARE_BRACKET_MESSAGE = 'Closing square bracket with no opening bracket.';

const UNMATCHED_OPENING_CURLY_BRACKET_DIAGNOSTIC_CODE = 'unmatched-opening-curly-bracket';
const UNMATCHED_OPENING_CURLY_BRACKET_MESSAGE = 'Opening curly bracket with no closing bracket.';

const UNMATCHED_CLOSING_CURLY_BRACKET_DIAGNOSTIC_CODE = 'unmatched-closing-curly-bracket';
const UNMATCHED_CLOSING_CURLY_BRACKET_MESSAGE = 'Closing curly bracket with no opening bracket.';

const UNMATCHED_OPENING_PUNCTUATION_MARK_DIAGNOSTIC_CODE = 'unmatched-opening-punctuation-mark';
const UNMATCHED_OPENING_PUNCTUATION_MARK_MESSAGE = 'Opening punctuation mark with no closing mark.';

const UNMATCHED_CLOSING_PUNCTUATION_MARK_DIAGNOSTIC_CODE = 'unmatched-closing-punctuation-mark';
const UNMATCHED_CLOSING_PUNCTUATION_MARK_MESSAGE = 'Closing punctuation mark with no opening mark.';

const OVERLAPPING_PUNCTUATION_PAIR_DIAGNOSTIC_CODE = 'overlapping-punctuation-pairs';

export class PairedPunctuationChecker extends AbstractChecker {
  constructor(
    documentManager: DocumentManager<TextDocument>,
    private readonly pairedPunctuationConfig: PairedPunctuationConfig,
  ) {
    super('paired-punctuation-checker', documentManager);
  }

  protected validateTextDocument(textDocument: TextDocument): Diagnostic[] {
    const diagnosticFactory: DiagnosticFactory = new DiagnosticFactory(this.id, textDocument);

    const quotationErrorFinder: PairedPunctuationErrorFinder = new PairedPunctuationErrorFinder(
      this.pairedPunctuationConfig,
      diagnosticFactory,
    );
    return quotationErrorFinder.produceDiagnostics(textDocument.getText());
  }
  protected getFixes(_textDocument: TextDocument, diagnostic: Diagnostic): DiagnosticFix[] {
    if (
      diagnostic.code === UNMATCHED_CLOSING_CURLY_BRACKET_DIAGNOSTIC_CODE ||
      diagnostic.code === UNMATCHED_CLOSING_PARENTHESIS_DIAGNOSTIC_CODE ||
      diagnostic.code === UNMATCHED_CLOSING_PUNCTUATION_MARK_DIAGNOSTIC_CODE ||
      diagnostic.code === UNMATCHED_CLOSING_SQUARE_BRACKET_DIAGNOSTIC_CODE ||
      diagnostic.code === UNMATCHED_OPENING_CURLY_BRACKET_DIAGNOSTIC_CODE ||
      diagnostic.code === UNMATCHED_OPENING_PARENTHESIS_DIAGNOSTIC_CODE ||
      diagnostic.code === UNMATCHED_OPENING_PUNCTUATION_MARK_DIAGNOSTIC_CODE ||
      diagnostic.code === UNMATCHED_OPENING_SQUARE_BRACKET_DIAGNOSTIC_CODE
    ) {
      return [StandardFixes.punctuationRemovalFix(diagnostic)];
    }
    return [];
  }
}

class PairedPunctuationErrorFinder {
  private diagnosticList: DiagnosticList;

  constructor(
    private readonly pairedPunctuationConfig: PairedPunctuationConfig,
    private readonly diagnosticFactory: DiagnosticFactory,
  ) {
    this.diagnosticList = new DiagnosticList();
  }

  private reset(): void {
    this.diagnosticList = new DiagnosticList();
  }

  public produceDiagnostics(text: string): Diagnostic[] {
    this.reset();
    const pairedPunctuationAnalyzer: PairedPunctuationAnalyzer = new PairedPunctuationAnalyzer(
      this.pairedPunctuationConfig,
    );
    const analysis: PairedPunctuationAnalysis = pairedPunctuationAnalyzer.analyze(text);

    this.createDiagnostics(analysis);
    return this.diagnosticList.toArray();
  }

  private createDiagnostics(analysis: PairedPunctuationAnalysis) {
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
    const message: string = this.getUnmatchedErrorMessage(punctuationMark);

    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(code)
      .setSeverity(DiagnosticSeverity.Error)
      .setRange(punctuationMark.startIndex, punctuationMark.endIndex)
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

  private getUnmatchedErrorMessage(punctuationMark: PairedPunctuationMetadata): string {
    if (punctuationMark.direction === PairedPunctuationDirection.Opening) {
      if (punctuationMark.text === '(') {
        return UNMATCHED_OPENING_PARENTHESIS_MESSAGE;
      } else if (punctuationMark.text === '[') {
        return UNMATCHED_OPENING_SQUARE_BRACKET_MESSAGE;
      } else if (punctuationMark.text === '{') {
        return UNMATCHED_OPENING_CURLY_BRACKET_MESSAGE;
      } else {
        return UNMATCHED_OPENING_PUNCTUATION_MARK_MESSAGE;
      }
    } else {
      if (punctuationMark.text === ')') {
        return UNMATCHED_CLOSING_PARENTHESIS_MESSAGE;
      } else if (punctuationMark.text === ']') {
        return UNMATCHED_CLOSING_SQUARE_BRACKET_MESSAGE;
      } else if (punctuationMark.text === '}') {
        return UNMATCHED_CLOSING_CURLY_BRACKET_MESSAGE;
      } else {
        return UNMATCHED_CLOSING_PUNCTUATION_MARK_MESSAGE;
      }
    }
  }

  private addOverlappingPunctuationWarning(overlappingPairs: OverlappingPairs): void {
    this.addFirstOverlappingPairWarning(overlappingPairs);
    this.addSecondOverlappingPairWarning(overlappingPairs);
  }

  private addFirstOverlappingPairWarning(overlappingPairs: OverlappingPairs): void {
    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(OVERLAPPING_PUNCTUATION_PAIR_DIAGNOSTIC_CODE)
      .setSeverity(DiagnosticSeverity.Warning)
      .setRange(overlappingPairs.getOpeningMark().startIndex, overlappingPairs.getOpeningMark().endIndex)
      .setMessage(
        this.createOverlappingPairMessage(overlappingPairs.getOpeningMark(), overlappingPairs.getClosingMark()),
      )
      .build();

    this.diagnosticList.addDiagnostic(diagnostic);
  }

  private addSecondOverlappingPairWarning(overlappingPairs: OverlappingPairs): void {
    const diagnostic: Diagnostic = this.diagnosticFactory
      .newBuilder()
      .setCode(OVERLAPPING_PUNCTUATION_PAIR_DIAGNOSTIC_CODE)
      .setSeverity(DiagnosticSeverity.Warning)
      .setRange(overlappingPairs.getClosingMark().startIndex, overlappingPairs.getClosingMark().endIndex)
      .setMessage(
        this.createOverlappingPairMessage(overlappingPairs.getClosingMark(), overlappingPairs.getOpeningMark()),
      )
      .build();

    this.diagnosticList.addDiagnostic(diagnostic);
  }

  private createOverlappingPairMessage(
    focusedPunctuationMark: PairedPunctuationMetadata,
    otherPunctuationMark: PairedPunctuationMetadata,
  ): string {
    return (
      'This pair of punctuation marks ' +
      this.createExemplaryPunctuationPairStr(focusedPunctuationMark) +
      ' overlaps with another pair ' +
      this.createExemplaryPunctuationPairStr(otherPunctuationMark) +
      '.'
    );
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

class PairedPunctuationAnalyzer {
  private punctuationStack: PairedPunctuationMetadata[] = [];
  private pairedPunctuationAnalysis: PairedPunctuationAnalysis = new PairedPunctuationAnalysis();

  constructor(private readonly pairedPunctuationConfig: PairedPunctuationConfig) {}

  public analyze(text: string): PairedPunctuationAnalysis {
    this.reset();

    const pairedPunctuationIterator: PairedPunctuationIterator = new PairedPunctuationIterator(
      this.pairedPunctuationConfig,
      text,
    );
    while (pairedPunctuationIterator.hasNext()) {
      this.processPunctuationMark(pairedPunctuationIterator.next());
    }
    this.handleUnmatchedPunctuationMarks();

    return this.pairedPunctuationAnalysis;
  }

  private reset(): void {
    this.punctuationStack = [];
    this.pairedPunctuationAnalysis = new PairedPunctuationAnalysis();
  }

  private processPunctuationMark(punctuationMark: PairedPunctuationMetadata): void {
    this.processPunctuationMarkByDirection(punctuationMark);
  }

  private processPunctuationMarkByDirection(punctuationMark: PairedPunctuationMetadata) {
    if (punctuationMark.direction === PairedPunctuationDirection.Opening) {
      this.processOpeningQuotationMark(punctuationMark);
    } else if (punctuationMark.direction === PairedPunctuationDirection.Closing) {
      this.processClosingQuotationMark(punctuationMark);
    }
  }

  private processOpeningQuotationMark(punctuationMark: PairedPunctuationMetadata): void {
    this.punctuationStack.push(punctuationMark);
  }

  private processClosingQuotationMark(punctuationMark: PairedPunctuationMetadata): void {
    if (this.punctuationStack.length > 0) {
      if (
        this.pairedPunctuationConfig.doMarksConstituteAPair(
          this.punctuationStack[this.punctuationStack.length - 1].text,
          punctuationMark.text,
        )
      ) {
        this.punctuationStack.pop();
      } else {
        this.processMismatchedMarks(punctuationMark);
      }
    } else if (this.pairedPunctuationConfig.shouldErrorForUnmatchedMarks(punctuationMark.text)) {
      this.pairedPunctuationAnalysis.addUnmatchedPunctuationMark(punctuationMark);
    }
  }

  private processMismatchedMarks(punctuationMark: PairedPunctuationMetadata): void {
    const correspondingMark: PairedPunctuationMetadata | undefined =
      this.getCorrespondingMarkFromStack(punctuationMark);
    if (correspondingMark !== undefined) {
      this.removeItemFromPunctuationStack(correspondingMark);
      this.pairedPunctuationAnalysis.addOverlappingPunctuationMarks(
        this.punctuationStack[this.punctuationStack.length - 1],
        punctuationMark,
      );
    } else if (this.pairedPunctuationConfig.shouldErrorForUnmatchedMarks(punctuationMark.text)) {
      this.pairedPunctuationAnalysis.addUnmatchedPunctuationMark(punctuationMark);
    }
  }

  private getCorrespondingMarkFromStack(
    punctuationMark: PairedPunctuationMetadata,
  ): PairedPunctuationMetadata | undefined {
    // iterate through the stack backwards to find the most recent matching mark
    for (let index = this.punctuationStack.length - 1; index >= 0; --index) {
      if (
        this.pairedPunctuationConfig.doMarksConstituteAPair(this.punctuationStack[index].text, punctuationMark.text)
      ) {
        return this.punctuationStack[index];
      }
    }
    return undefined;
  }

  private removeItemFromPunctuationStack(punctuationMark: PairedPunctuationMetadata): void {
    const index = this.punctuationStack.indexOf(punctuationMark);
    if (index > -1) {
      this.punctuationStack.splice(index, 1);
    }
  }

  private handleUnmatchedPunctuationMarks(): void {
    let punctuationMark: PairedPunctuationMetadata | undefined;
    while ((punctuationMark = this.punctuationStack.shift())) {
      if (this.pairedPunctuationConfig.shouldErrorForUnmatchedMarks(punctuationMark.text)) {
        this.pairedPunctuationAnalysis.addUnmatchedPunctuationMark(punctuationMark);
      }
    }
  }
}

class OverlappingPairs {
  constructor(
    private readonly closingMark: PairedPunctuationMetadata,
    private readonly openingMark: PairedPunctuationMetadata,
  ) {}

  public getOpeningMark(): PairedPunctuationMetadata {
    return this.openingMark;
  }

  public getClosingMark(): PairedPunctuationMetadata {
    return this.closingMark;
  }
}

class PairedPunctuationAnalysis {
  private unmatchedPunctuationMarks: PairedPunctuationMetadata[] = [];
  private overlappingPunctuationMarks: OverlappingPairs[] = [];

  public addUnmatchedPunctuationMark(unmatchedPunctuationMark: PairedPunctuationMetadata): void {
    this.unmatchedPunctuationMarks.push(unmatchedPunctuationMark);
  }

  public addOverlappingPunctuationMarks(
    openingOverlappingPunctuationMark: PairedPunctuationMetadata,
    closingOverlappingPunctuationMark: PairedPunctuationMetadata,
  ): void {
    this.overlappingPunctuationMarks.push(
      new OverlappingPairs(openingOverlappingPunctuationMark, closingOverlappingPunctuationMark),
    );
  }

  public getUnmatchedPunctuationMarks(): PairedPunctuationMetadata[] {
    return this.unmatchedPunctuationMarks;
  }

  public getOverlappingPunctuationMarks(): OverlappingPairs[] {
    return this.overlappingPunctuationMarks;
  }
}

export class PairedPunctuationIterator {
  private readonly openingOrClosingMarkPattern: RegExp = /[()[\]{}]/g;
  private nextMark: PairedPunctuationMetadata | null = null;

  constructor(
    private readonly pairedPunctuationConfig: PairedPunctuationConfig,
    private readonly text: string,
  ) {
    this.openingOrClosingMarkPattern = pairedPunctuationConfig.createAllPairedMarksRegex();
    this.findNext();
  }

  private findNext(): void {
    const match: RegExpExecArray | null = this.openingOrClosingMarkPattern.exec(this.text);
    if (match === null) {
      this.nextMark = null;
      return;
    }

    const matchingText = match[0];
    if (this.pairedPunctuationConfig.isOpeningMark(matchingText)) {
      this.nextMark = {
        text: matchingText,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        direction: PairedPunctuationDirection.Opening,
      };
    } else {
      this.nextMark = {
        text: matchingText,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        direction: PairedPunctuationDirection.Closing,
      };
    }
  }

  public hasNext(): boolean {
    return this.nextMark !== null;
  }

  public next(): PairedPunctuationMetadata {
    const markToReturn: PairedPunctuationMetadata | null = this.nextMark;
    if (markToReturn === null) {
      throw new Error(`PairedPunctuationIterator's next() function called after hasNext() returned false`);
    }
    this.findNext();
    return markToReturn;
  }
}

export const _privateTestingClasses = {
  PairedPunctuationErrorFinder,
  PairedPunctuationAnalyzer,
  OverlappingPairs,
  PairedPunctuationAnalysis,
  PairedPunctuationIterator,
};
