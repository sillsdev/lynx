import { Range } from '@sillsdev/lynx';

import { Checkable, CheckableGroup } from '../checkable';
import { PairedPunctuationDirection, PairedPunctuationMetadata } from '../utils';
import { QuotationConfig } from './quotation-config';

export interface QuoteMetadata extends PairedPunctuationMetadata {
  depth: QuotationDepth;
  isAutocorrectable: boolean;
  parentDepth?: QuotationDepth;
}

export class UnresolvedQuoteMetadata {
  private depths: Set<number> = new Set<number>();
  private directions: Set<PairedPunctuationDirection> = new Set<PairedPunctuationDirection>();
  private startIndex = 0;
  private endIndex = 0;
  private enclosingRange: Range | undefined = undefined;
  private text = '';
  private isAutocorrectable = false;

  // Private constructor so that the class can only be instantiated through the Builder
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  public isDepthPossible(possibleDepth: QuotationDepth): boolean {
    return this.depths.has(possibleDepth.asNumber());
  }

  public isDirectionPossible(possibleDirection: PairedPunctuationDirection): boolean {
    return this.directions.has(possibleDirection);
  }

  public numPossibleDepths(): number {
    return this.depths.size;
  }

  public numPossibleDirections(): number {
    return this.directions.size;
  }

  public findBestDepth(depthScoringFunction: (depth: QuotationDepth) => number): QuotationDepth {
    let bestScore = Number.NEGATIVE_INFINITY;
    let bestDepth: QuotationDepth = QuotationDepth.Primary;
    for (const d of this.depths) {
      const depth = QuotationDepth.fromNumber(d);
      const score: number = depthScoringFunction(depth);
      if (score > bestScore) {
        bestScore = score;
        bestDepth = depth;
      }
    }
    return bestDepth;
  }

  public findBestDirection(
    directionScoringFunction: (depth: PairedPunctuationDirection) => number,
  ): PairedPunctuationDirection {
    let bestScore = Number.NEGATIVE_INFINITY;
    let bestDirection: PairedPunctuationDirection = PairedPunctuationDirection.Opening;
    for (const direction of this.directions) {
      const score: number = directionScoringFunction(direction);
      if (score > bestScore) {
        bestScore = score;
        bestDirection = direction;
      }
    }
    return bestDirection;
  }

  public resolve(chosenDepth: QuotationDepth, chosenDirection: PairedPunctuationDirection): QuoteMetadata {
    this.checkForValidResolution(chosenDepth, chosenDirection);
    return {
      depth: chosenDepth,
      direction: chosenDirection,
      startIndex: this.startIndex,
      endIndex: this.endIndex,
      enclosingRange: this.enclosingRange,
      text: this.text,
      isAutocorrectable: this.isAutocorrectable,
    };
  }

  private checkForValidResolution(chosenDepth: QuotationDepth, chosenDirection: PairedPunctuationDirection): void {
    if (!this.isDepthPossible(chosenDepth)) {
      throw new Error(
        `Cannot resolve quote metadata with depth ${chosenDepth.asNumber().toFixed()}, as this depth is not possible.`,
      );
    }
    if (!this.isDirectionPossible(chosenDirection)) {
      throw new Error(
        `Cannot resolve quote metadata with direction \u201C${chosenDirection}\u201D as this direction is not possible`,
      );
    }
  }

  public static Builder = class {
    objectInstance: UnresolvedQuoteMetadata = new UnresolvedQuoteMetadata();

    public setStartIndex(startIndex: number): this {
      this.objectInstance.startIndex = startIndex;
      return this;
    }

    public setEndIndex(endIndex: number): this {
      this.objectInstance.endIndex = endIndex;
      return this;
    }

    public setEnclosingRange(range: Range | undefined): this {
      if (range !== undefined) {
        this.objectInstance.enclosingRange = range;
      }
      return this;
    }

    public addDepth(depth: QuotationDepth): this {
      this.objectInstance.depths.add(depth.asNumber());
      return this;
    }

    public addDepths(depths: QuotationDepth[]): this {
      for (const depth of depths) {
        this.addDepth(depth);
      }
      return this;
    }

    public addDirection(direction: PairedPunctuationDirection): this {
      this.objectInstance.directions.add(direction);
      return this;
    }

    public addDirections(directions: PairedPunctuationDirection[]): this {
      for (const direction of directions) {
        this.addDirection(direction);
      }
      return this;
    }

    public setText(text: string): this {
      this.objectInstance.text = text;
      return this;
    }

    public markAsAutocorrectable(): this {
      this.objectInstance.isAutocorrectable = true;
      return this;
    }

    public build(): UnresolvedQuoteMetadata {
      this.checkForErrors();
      return this.objectInstance;
    }

    checkForErrors(): void {
      if (this.objectInstance.startIndex < 0) {
        throw new Error(`The startIndex for an UnresolvedQuoteMetadata object must be greater than or equal to 0.`);
      }
      if (this.objectInstance.endIndex < 0) {
        throw new Error(`The endIndex for an UnresolvedQuoteMetadata object must be greater than or equal to 0.`);
      }
      if (this.objectInstance.startIndex >= this.objectInstance.endIndex) {
        throw new Error(
          `The endIndex (${this.objectInstance.endIndex.toFixed()}) for an UnresolvedQuoteMetadata object must be greater than its startIndex (${this.objectInstance.startIndex.toFixed()}).`,
        );
      }
      if (this.objectInstance.depths.size === 0) {
        throw new Error(`UnresolvedQuoteMetadata object has no possible quotation depths specified.`);
      }
      if (this.objectInstance.directions.size === 0) {
        throw new Error(`UnresolvedQuoteMetadata object has no possible quotation directions specified.`);
      }
      if (this.objectInstance.text === '') {
        throw new Error(`UnresolvedQuoteMetadata object has no text specified.`);
      }
    }
  };
}

export class QuotationDepth {
  // static instances for convenience
  public static Primary: QuotationDepth = new QuotationDepth(1);
  public static Secondary: QuotationDepth = new QuotationDepth(2);
  public static Tertiary: QuotationDepth = new QuotationDepth(3);

  public static fromNumber(depth: number): QuotationDepth {
    if (depth < 1) {
      throw new Error(`Depth of quotation cannot be less than 1. Provided depth was ${depth.toString()}.`);
    }
    if (!Number.isInteger(depth)) {
      throw new Error(`Depth of quotation must be an integer. Provided depth was ${depth.toString()}.`);
    }
    return new QuotationDepth(depth);
  }

  protected constructor(private readonly depth: number) {}

  public asNumber(): number {
    return this.depth;
  }

  public name(): string {
    if (this.depth === 1) {
      return 'Primary';
    }
    if (this.depth === 2) {
      return 'Secondary';
    }
    if (this.depth === 3) {
      return 'Tertiary';
    }
    return `${this.depth.toFixed()}th-level`;
  }

  public deeper(): QuotationDepth {
    return QuotationDepth.fromNumber(this.depth + 1);
  }

  public shallower(): QuotationDepth {
    return QuotationDepth.fromNumber(this.depth - 1);
  }

  public isDeeperThan(otherDepth: QuotationDepth): boolean {
    return this.depth > otherDepth.depth;
  }

  public isShallowerThan(otherDepth: QuotationDepth): boolean {
    return this.depth < otherDepth.depth;
  }

  public equals(otherDepth: QuotationDepth): boolean {
    return this.depth === otherDepth.depth;
  }
}

export class QuotationRootLevel extends QuotationDepth {
  constructor() {
    super(0);
  }

  public name(): string {
    return 'Root level';
  }
}

export interface QuoteCorrection {
  existingQuotationMark: QuoteMetadata;
  correctedQuotationMark: QuoteMetadata;
}

export class QuotationIterator implements IterableIterator<UnresolvedQuoteMetadata> {
  private readonly openingOrClosingQuotePattern: RegExp = /[\u201C\u201D]/g;
  private nextQuote: UnresolvedQuoteMetadata | null = null;
  private currentCheckable: Checkable | undefined;

  constructor(
    private readonly quotationConfig: QuotationConfig,
    private readonly input: CheckableGroup,
  ) {
    this.openingOrClosingQuotePattern = quotationConfig.createAllQuotesRegex();
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
      this.nextQuote = null;
      return;
    }

    let match: RegExpExecArray | null;
    do {
      match = this.openingOrClosingQuotePattern.exec(this.currentCheckable.getText());
      if (match === null) {
        this.currentCheckable = this.advanceToNextCheckable();
        this.findNext();
        return;
      }
    } while (this.shouldSkipQuote(match));

    const matchingText = match[0];
    const unresolvedQuoteMetadataBuilder = new UnresolvedQuoteMetadata.Builder()
      .setStartIndex(match.index)
      .setEndIndex(match.index + match[0].length)
      .addDepths(this.quotationConfig.getPossibleQuoteDepths(matchingText))
      .addDirections(this.quotationConfig.getPossibleQuoteDirections(matchingText))
      .setText(matchingText);

    unresolvedQuoteMetadataBuilder.setEnclosingRange(this.currentCheckable.getEnclosingRange());
    if (this.quotationConfig.isQuoteAutocorrectable(matchingText)) {
      unresolvedQuoteMetadataBuilder.markAsAutocorrectable();
    }

    this.nextQuote = unresolvedQuoteMetadataBuilder.build();
  }

  private shouldSkipQuote(quoteMatch: RegExpExecArray): boolean {
    if (!this.quotationConfig.isQuotationMarkPotentiallyIgnoreable(quoteMatch[0])) {
      return false;
    }
    const leftContext: string =
      this.currentCheckable?.getText().substring(Math.max(0, quoteMatch.index - 5), quoteMatch.index) ?? '';
    const rightContext: string =
      this.currentCheckable
        ?.getText()
        .substring(
          quoteMatch.index + quoteMatch[0].length,
          Math.min(this.currentCheckable.getText().length, quoteMatch.index + quoteMatch[0].length + 5),
        ) ?? '';
    return this.quotationConfig.shouldIgnoreQuotationMark(quoteMatch[0], leftContext, rightContext);
  }

  [Symbol.iterator](): this {
    return this;
  }

  next(): IteratorResult<UnresolvedQuoteMetadata> {
    if (this.nextQuote !== null) {
      const markToReturn = {
        done: false,
        value: this.nextQuote,
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
