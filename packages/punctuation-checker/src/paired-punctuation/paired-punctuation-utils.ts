import { PairedPunctuationDirection, PairedPunctuationMetadata, ScriptureNodeGroup, TextSegment } from '../utils';
import { PairedPunctuationConfig } from './paired-punctuation-config';

export class PairedPunctuationIterator {
  private readonly openingOrClosingMarkPattern: RegExp = /[()[\]{}]/g;
  private nextMark: PairedPunctuationMetadata | null = null;
  private readonly textSegments: TextSegment[];
  private textSegmentIndex = 0;

  constructor(
    private readonly pairedPunctuationConfig: PairedPunctuationConfig,
    input: string | ScriptureNodeGroup,
  ) {
    this.openingOrClosingMarkPattern = pairedPunctuationConfig.createAllPairedMarksRegex();
    this.textSegments = this.createTextSegments(input);
    this.findNext();
  }

  private createTextSegments(input: string | ScriptureNodeGroup): TextSegment[] {
    if (typeof input === 'string') {
      return [new TextSegment(input)];
    }
    return input.toTextSegmentArray();
  }

  private findNext(): void {
    const match: RegExpExecArray | null = this.openingOrClosingMarkPattern.exec(
      this.textSegments[this.textSegmentIndex].getText(),
    );
    if (match === null) {
      if (this.textSegmentIndex < this.textSegments.length - 1) {
        this.textSegmentIndex++;
        this.findNext();
        return;
      }

      this.nextMark = null;
      return;
    }

    const matchingText = match[0];
    if (this.pairedPunctuationConfig.isOpeningMark(matchingText)) {
      this.nextMark = {
        text: matchingText,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        enclosingRange: this.textSegments[this.textSegmentIndex].hasRange()
          ? this.textSegments[this.textSegmentIndex].getRange()
          : undefined,
        direction: PairedPunctuationDirection.Opening,
      };
    } else {
      this.nextMark = {
        text: matchingText,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        enclosingRange: this.textSegments[this.textSegmentIndex].hasRange()
          ? this.textSegments[this.textSegmentIndex].getRange()
          : undefined,
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
