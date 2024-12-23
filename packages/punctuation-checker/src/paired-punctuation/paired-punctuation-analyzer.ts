import { ScriptureNode } from '@sillsdev/lynx';

import { PairedPunctuationDirection, PairedPunctuationMetadata } from '../utils';
import { PairedPunctuationConfig } from './paired-punctuation-config';
import { PairedPunctuationIterator } from './paired-punctuation-utils';

export class PairedPunctuationAnalyzer {
  private punctuationStack: PairedPunctuationMetadata[] = [];
  private pairedPunctuationAnalysis: PairedPunctuationAnalysis = new PairedPunctuationAnalysis();

  constructor(private readonly pairedPunctuationConfig: PairedPunctuationConfig) {}

  public analyze(input: string | ScriptureNode[]): PairedPunctuationAnalysis {
    this.reset();

    const pairedPunctuationIterator: PairedPunctuationIterator = new PairedPunctuationIterator(
      this.pairedPunctuationConfig,
      input,
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

export class OverlappingPairs {
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

export class PairedPunctuationAnalysis {
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
