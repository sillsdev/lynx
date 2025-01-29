import { Checkable, CheckableGroup } from '../checkable';
import { PairedPunctuationDirection, PairedPunctuationMetadata } from '../utils';
import { PairedPunctuationConfig } from './paired-punctuation-config';

export class PairedPunctuationIterator {
  private readonly openingOrClosingMarkPattern: RegExp = /[()[\]{}]/g;
  private nextMark: PairedPunctuationMetadata | null = null;
  private currentCheckable: Checkable | undefined;

  constructor(
    private readonly pairedPunctuationConfig: PairedPunctuationConfig,
    private readonly input: CheckableGroup,
  ) {
    this.openingOrClosingMarkPattern = pairedPunctuationConfig.createAllPairedMarksRegex();
    this.currentCheckable = this.advanceToNextCheckable();
    this.findNext();
  }

  private advanceToNextCheckable(): Checkable | undefined {
    const nextCheckableIteratorResult: IteratorResult<Checkable> = this.input.next();
    if (nextCheckableIteratorResult.done) {
      return undefined;
    } else {
      return nextCheckableIteratorResult.value;
    }
  }

  private findNext(): void {
    if (this.currentCheckable === undefined) {
      this.nextMark = null;
      return;
    }
    const match: RegExpExecArray | null = this.openingOrClosingMarkPattern.exec(this.currentCheckable.getText());
    if (match === null) {
      this.currentCheckable = this.advanceToNextCheckable();
      this.findNext();
      return;
    }

    const matchingText = match[0];
    if (this.pairedPunctuationConfig.isOpeningMark(matchingText)) {
      this.nextMark = {
        text: matchingText,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        enclosingRange: this.currentCheckable.getEnclosingRange(),
        direction: PairedPunctuationDirection.Opening,
      };
    } else {
      this.nextMark = {
        text: matchingText,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        enclosingRange: this.currentCheckable.getEnclosingRange(),
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
