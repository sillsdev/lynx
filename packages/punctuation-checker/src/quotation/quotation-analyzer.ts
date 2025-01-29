import { CheckableGroup } from '../checkable';
import { PairedPunctuationDirection } from '../utils';
import { QuotationConfig } from './quotation-config';
import {
  QuotationDepth,
  QuotationIterator,
  QuotationRootLevel,
  QuoteCorrection,
  QuoteMetadata,
  UnresolvedQuoteMetadata,
} from './quotation-utils';

export class QuotationAnalyzer {
  private quoteStack: QuoteMetadata[] = [];
  private quotationAnalysis: QuotationAnalysis = new QuotationAnalysis();

  constructor(private readonly quotationConfig: QuotationConfig) {}

  public analyze(input: CheckableGroup): QuotationAnalysis {
    this.reset();

    const quotationIterator: QuotationIterator = new QuotationIterator(this.quotationConfig, input);
    while (quotationIterator.hasNext()) {
      this.processQuotationMark(quotationIterator.next());
    }
    this.handleUnmatchedQuotationMarks();

    return this.quotationAnalysis;
  }

  private reset(): void {
    this.quoteStack = [];
    this.quotationAnalysis = new QuotationAnalysis();
  }

  private processQuotationMark(unresolvedQuotationMark: UnresolvedQuoteMetadata): void {
    const resolvedQuotationMark: QuoteMetadata = this.resolveQuotationMark(unresolvedQuotationMark);

    this.processQuotationMarkByDirection(resolvedQuotationMark);
    this.addAutocorrectionIfNecessary(resolvedQuotationMark);
    this.warnForDepthIfNecessary(resolvedQuotationMark);
  }

  private resolveQuotationMark(unresolvedQuotationMark: UnresolvedQuoteMetadata): QuoteMetadata {
    const quotationResolver: QuotationResolver = new QuotationResolver(
      this.quoteStack.length > 0 ? this.quoteStack[this.quoteStack.length - 1] : null,
    );
    return quotationResolver.resolve(unresolvedQuotationMark);
  }

  private processQuotationMarkByDirection(quotationMark: QuoteMetadata) {
    if (quotationMark.direction === PairedPunctuationDirection.Opening) {
      this.processOpeningQuotationMark(quotationMark);
    } else if (quotationMark.direction === PairedPunctuationDirection.Closing) {
      this.processClosingQuotationMark(quotationMark);
    }
  }

  private processOpeningQuotationMark(quotationMark: QuoteMetadata): void {
    const parentDepth = this.currentDepth();
    if (!quotationMark.depth.equals(parentDepth.deeper())) {
      quotationMark.parentDepth = parentDepth;
      this.quotationAnalysis.addIncorrectlyNestedQuote(quotationMark);
    }
    this.quoteStack.push(quotationMark);
  }

  private processClosingQuotationMark(quotationMark: QuoteMetadata): void {
    if (quotationMark.depth.isDeeperThan(this.currentDepth())) {
      this.quotationAnalysis.addUnmatchedQuote(quotationMark);
    } else if (quotationMark.depth.isShallowerThan(this.currentDepth())) {
      this.rewindStackToMatch(quotationMark);
    }

    if (quotationMark.depth.equals(this.currentDepth())) {
      this.quoteStack.pop();
    }
  }

  private rewindStackToMatch(quotationMark: QuoteMetadata): void {
    while (this.currentDepth().isDeeperThan(quotationMark.depth)) {
      const unmatchedOpeningQuote: QuoteMetadata = this.quoteStack.pop()!;
      this.quotationAnalysis.addUnmatchedQuote(unmatchedOpeningQuote);
    }
  }

  private handleUnmatchedQuotationMarks(): void {
    let quotationMark: QuoteMetadata | undefined;
    while ((quotationMark = this.quoteStack.shift())) {
      this.quotationAnalysis.addUnmatchedQuote(quotationMark);
    }
  }

  private addAutocorrectionIfNecessary(quotationMark: QuoteMetadata): void {
    if (!quotationMark.isAutocorrectable) {
      return;
    }
    const correctedCharacter: string | undefined = this.quotationConfig.getUnambiguousQuotationMarkByType(
      quotationMark.depth,
      quotationMark.direction,
    );

    if (correctedCharacter === undefined) {
      return;
    }

    const correctedQuotationMark = { ...quotationMark };
    correctedQuotationMark.text = correctedCharacter;
    this.quotationAnalysis.addAmbiguousQuoteCorrection({
      existingQuotationMark: quotationMark,
      correctedQuotationMark: correctedQuotationMark,
    });
  }

  private currentDepth(): QuotationDepth {
    if (this.quoteStack.length > 0) {
      return this.quoteStack[this.quoteStack.length - 1].depth;
    }
    return new QuotationRootLevel();
  }

  private warnForDepthIfNecessary(quotationMark: QuoteMetadata): void {
    if (this.quotationConfig.shouldWarnForDepth(quotationMark.depth)) {
      this.quotationAnalysis.addTooDeeplyNestedQuote(quotationMark);
    }
  }
}

class QuotationResolver {
  constructor(private readonly deepestOpenQuote: QuoteMetadata | null) {}

  resolve(unresolvedQuotationMark: UnresolvedQuoteMetadata): QuoteMetadata {
    if (this.canBeTriviallyResolved(unresolvedQuotationMark)) {
      return this.triviallyResolve(unresolvedQuotationMark);
    }
    if (this.deepestOpenQuote === null) {
      return this.resolveTopLevelOpeningQuoteIfPossible(unresolvedQuotationMark);
    }
    return this.resolveAllowedQuoteIfPossible(unresolvedQuotationMark);
  }

  private canBeTriviallyResolved(unresolvedQuotationMark: UnresolvedQuoteMetadata): boolean {
    if (unresolvedQuotationMark.numPossibleDepths() === 1 && unresolvedQuotationMark.numPossibleDirections() === 1) {
      return true;
    }
    return false;
  }

  private triviallyResolve(unresolvedQuotationMark: UnresolvedQuoteMetadata): QuoteMetadata {
    const chosenDepth: QuotationDepth = unresolvedQuotationMark.findBestDepth(() => 1);
    const chosenDirection: PairedPunctuationDirection = unresolvedQuotationMark.findBestDirection(() => 1);
    return unresolvedQuotationMark.resolve(chosenDepth, chosenDirection);
  }

  private resolveTopLevelOpeningQuoteIfPossible(unresolvedQuotationMark: UnresolvedQuoteMetadata): QuoteMetadata {
    return this.resolveWithPreferences(unresolvedQuotationMark, [
      { direction: PairedPunctuationDirection.Opening, depth: QuotationDepth.Primary },
    ]);
  }

  private resolveWithPreferences(
    unresolvedQuotationMark: UnresolvedQuoteMetadata,
    preferences: DepthAndDirectionPreference[],
  ): QuoteMetadata {
    for (const preference of preferences) {
      if (this.canPreferenceBeSatisfied(unresolvedQuotationMark, preference)) {
        return unresolvedQuotationMark.resolve(preference.depth, preference.direction);
      }
    }
    const bestDefaultDirection: PairedPunctuationDirection = this.chooseBestDefaultDirection(unresolvedQuotationMark);
    const bestDefaultDepth: QuotationDepth = this.chooseBestDefaultDepth(unresolvedQuotationMark, bestDefaultDirection);
    return unresolvedQuotationMark.resolve(bestDefaultDepth, bestDefaultDirection);
  }

  private canPreferenceBeSatisfied(
    unresolvedQuotationMark: UnresolvedQuoteMetadata,
    preference: DepthAndDirectionPreference,
  ) {
    return (
      unresolvedQuotationMark.isDepthPossible(preference.depth) &&
      unresolvedQuotationMark.isDirectionPossible(preference.direction)
    );
  }

  // If we get to the default functions, we've already checked that
  // it can't be a legal closing quote, so we assume that the user is
  // more likely to have meant to open a new quote
  private chooseBestDefaultDirection(unresolvedQuotationMark: UnresolvedQuoteMetadata): PairedPunctuationDirection {
    return unresolvedQuotationMark.findBestDirection((direction) =>
      direction === PairedPunctuationDirection.Opening ? 1 : 0,
    );
  }

  private chooseBestDefaultDepth(
    unresolvedQuotationMark: UnresolvedQuoteMetadata,
    chosenDirection: PairedPunctuationDirection,
  ): QuotationDepth {
    // Choose a shallower depth for a closing quote and deeper for an opening quote,
    // but as close the ideal depth as possible
    if (chosenDirection === PairedPunctuationDirection.Opening) {
      const idealDepth: QuotationDepth = this.deepestOpenQuote?.depth.deeper() ?? QuotationDepth.Primary;
      return unresolvedQuotationMark.findBestDepth(
        (depth) =>
          -Math.abs(depth.asNumber() - idealDepth.asNumber()) + (depth.asNumber() >= idealDepth.asNumber() ? 0.5 : 0),
      );
    } else {
      const idealDepth: QuotationDepth = this.deepestOpenQuote?.depth ?? QuotationDepth.Primary;
      return unresolvedQuotationMark.findBestDepth(
        (depth) =>
          -Math.abs(depth.asNumber() - idealDepth.asNumber()) + (depth.asNumber() <= idealDepth.asNumber() ? 0.5 : 0),
      );
    }
  }

  // this function is only called if deepestOpenQuote is not null
  private resolveAllowedQuoteIfPossible(unresolvedQuotationMark: UnresolvedQuoteMetadata): QuoteMetadata {
    return this.resolveWithPreferences(unresolvedQuotationMark, [
      { direction: PairedPunctuationDirection.Closing, depth: this.deepestOpenQuote!.depth },
      { direction: PairedPunctuationDirection.Opening, depth: this.deepestOpenQuote!.depth.deeper() },
    ]);
  }
}

interface DepthAndDirectionPreference {
  depth: QuotationDepth;
  direction: PairedPunctuationDirection;
}

export class QuotationAnalysis {
  private unmatchedQuotes: QuoteMetadata[] = [];
  private incorrectlyNestedQuotes: QuoteMetadata[] = [];
  private ambiguousQuotes: QuoteCorrection[] = [];
  private tooDeeplyNestedQuotes: QuoteMetadata[] = [];

  addUnmatchedQuote(quote: QuoteMetadata): void {
    this.unmatchedQuotes.push(quote);
  }

  addIncorrectlyNestedQuote(quote: QuoteMetadata): void {
    this.incorrectlyNestedQuotes.push(quote);
  }

  addAmbiguousQuoteCorrection(quoteCorrection: QuoteCorrection): void {
    this.ambiguousQuotes.push(quoteCorrection);
  }

  addTooDeeplyNestedQuote(quote: QuoteMetadata): void {
    this.tooDeeplyNestedQuotes.push(quote);
  }

  public getUnmatchedQuotes(): QuoteMetadata[] {
    return this.unmatchedQuotes;
  }

  public getIncorrectlyNestedQuotes(): QuoteMetadata[] {
    return this.incorrectlyNestedQuotes;
  }

  public getAmbiguousQuoteCorrections(): QuoteCorrection[] {
    return this.ambiguousQuotes;
  }

  public getTooDeeplyNestedQuotes(): QuoteMetadata[] {
    return this.tooDeeplyNestedQuotes;
  }
}

export const _privateTestingClasses = {
  QuotationResolver,
};
