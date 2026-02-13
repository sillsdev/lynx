import { Checkable, CheckableGroup } from '../checkable';
import { PairedPunctuationDirection, PairedPunctuationMetadata } from '../utils';
import { PairedPunctuationConfig } from './paired-punctuation-config';

export class PairedPunctuationIterator implements IterableIterator<PairedPunctuationMetadata> {
  private readonly openingOrClosingMarkPattern: RegExp;
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
    const text = this.currentCheckable.getText();
    const match: RegExpExecArray | null = this.openingOrClosingMarkPattern.exec(text);
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
        verseRef: this.currentCheckable.getVerseRef(),
        leftContext: this.currentCheckable.getLeftContext(match.index, 5),
        rightContext: this.currentCheckable.getRightContext(match.index + match[0].length, 5),
      };
    } else {
      this.nextMark = {
        text: matchingText,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        enclosingRange: this.currentCheckable.getEnclosingRange(),
        direction: PairedPunctuationDirection.Closing,
        verseRef: this.currentCheckable.getVerseRef(),
        leftContext: this.currentCheckable.getLeftContext(match.index, 5),
        rightContext: this.currentCheckable.getRightContext(match.index + match[0].length, 5),
      };
    }
  }

  [Symbol.iterator](): this {
    return this;
  }

  next(): IteratorResult<PairedPunctuationMetadata> {
    if (this.nextMark !== null) {
      const markToReturn = {
        done: false,
        value: this.nextMark,
      };

      this.findNext();
      return markToReturn;
    }
    return {
      done: true,
      value: undefined,
    };
  }
}
