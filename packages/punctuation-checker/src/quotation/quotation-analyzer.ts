import { CheckableGroup } from '../checkable';
import { arePunctuationMarksConsecutive, PairedPunctuationDirection } from '../utils';
import { QuotationConfig, QuoteContinuerStyle } from './quotation-config';
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
  private quoteContinuerStack: QuoteMetadata[] = [];
  private quotationAnalysis: QuotationAnalysis = new QuotationAnalysis();

  constructor(private readonly quotationConfig: QuotationConfig) {}

  public analyze(input: CheckableGroup): QuotationAnalysis {
    this.reset();

    const quotationIterator: QuotationIterator = new QuotationIterator(this.quotationConfig, input);
    for (const unresolvedQuotationMetadata of quotationIterator) {
      this.processQuotationMark(unresolvedQuotationMetadata);
    }
    this.handleUnmatchedQuotationMarks();

    return this.quotationAnalysis;
  }

  private reset(): void {
    this.quoteStack = [];
    this.quoteContinuerStack = [];
    this.quotationAnalysis = new QuotationAnalysis();
  }

  private processQuotationMark(unresolvedQuotationMark: UnresolvedQuoteMetadata): void {
    const resolvedQuotationMark: QuoteMetadata = this.resolveQuotationMark(unresolvedQuotationMark);
    this.clearQuoteContinuerStackIfNecessary(resolvedQuotationMark);

    if (resolvedQuotationMark.isContinuer) {
      this.processQuoteContinuer(resolvedQuotationMark);
    } else {
      this.processOrdinaryQuotationMark(resolvedQuotationMark);
    }
  }

  private clearQuoteContinuerStackIfNecessary(resolvedQuotationMetadata: QuoteMetadata): void {
    if (
      !resolvedQuotationMetadata.isContinuer ||
      (this.quoteContinuerStack.length > 0 &&
        // Quote continuers for multiple levels must be consecutive
        !arePunctuationMarksConsecutive(
          this.quoteContinuerStack[this.quoteContinuerStack.length - 1],
          resolvedQuotationMetadata,
        ))
    ) {
      if (this.quoteContinuerStack.length > 0 && this.quoteContinuerStack.length < this.quoteStack.length) {
        this.addMissingQuoteContinuerToAnalysis();
      }

      this.quoteContinuerStack = [];
    }
  }

  private addMissingQuoteContinuerToAnalysis(): void {
    const quotationMarksToInsert = this.getMissingQuotationMarksToInsert();
    const missingQuoteContinuer = {
      ...this.quoteContinuerStack[this.quoteContinuerStack.length - 1],
    } as MissingQuoteContinuerMetadata;
    missingQuoteContinuer.missingQuoteContinuers = quotationMarksToInsert;
    this.quotationAnalysis.addMissingQuoteContinuer(missingQuoteContinuer);
  }

  private getMissingQuotationMarksToInsert(): string {
    let missingQuotationMarks = '';
    for (let quoteIndex = this.quoteContinuerStack.length; quoteIndex < this.quoteStack.length; ++quoteIndex) {
      missingQuotationMarks += this.quotationConfig.getQuoteContinuerByDepth(this.quoteStack[quoteIndex].depth) ?? '';
    }
    return missingQuotationMarks;
  }

  private resolveQuotationMark(unresolvedQuotationMark: UnresolvedQuoteMetadata): QuoteMetadata {
    const quotationResolver: QuotationResolver = new QuotationResolver(
      this.quoteStack.length > 0 ? this.quoteStack[this.quoteStack.length - 1] : null,
      this.quoteContinuerStack.length > 0 ? this.quoteContinuerStack[this.quoteContinuerStack.length - 1] : null,
    );
    return quotationResolver.resolve(unresolvedQuotationMark);
  }

  private processQuoteContinuer(quoteContinuer: QuoteMetadata): void {
    this.quoteContinuerStack.push(quoteContinuer);
  }

  private processOrdinaryQuotationMark(resolvedQuotationMark: QuoteMetadata): void {
    this.processQuotationMarkByDirection(resolvedQuotationMark);
    this.addQuoteCorrectionIfNecessary(resolvedQuotationMark);
    this.warnForDepthIfNecessary(resolvedQuotationMark);
  }

  private processQuotationMarkByDirection(quotationMark: QuoteMetadata): void {
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

  private addQuoteCorrectionIfNecessary(quotationMark: QuoteMetadata): void {
    if (!quotationMark.isAmbiguous) {
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
  constructor(
    private readonly deepestOpenQuote: QuoteMetadata | null,
    private readonly deepestOpenQuoteContinuer: QuoteMetadata | null,
    private readonly quoteContinuerStyle: QuoteContinuerStyle = QuoteContinuerStyle.English,
  ) {}

  resolve(unresolvedQuotationMark: UnresolvedQuoteMetadata): QuoteMetadata {
    if (this.canBeResolvedAsQuoteContinuer(unresolvedQuotationMark)) {
      return this.resolveAsQuoteContinuer(unresolvedQuotationMark);
    }

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
  ): boolean {
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

  private canBeResolvedAsQuoteContinuer(unresolvedQuotationMark: UnresolvedQuoteMetadata): boolean {
    if (!unresolvedQuotationMark.canBeQuoteContinuer() || this.deepestOpenQuote === null) {
      return false;
    }

    // A quote continuer should never appear immediately after an ordinary quotation mark
    if (arePunctuationMarksConsecutive(this.deepestOpenQuote, unresolvedQuotationMark.asPunctuationMetadata())) {
      return false;
    }

    if (
      (this.deepestOpenQuoteContinuer === null ||
        // Quote continuers for multiple levels must be consecutive
        !arePunctuationMarksConsecutive(
          this.deepestOpenQuoteContinuer,
          unresolvedQuotationMark.asPunctuationMetadata(),
        )) &&
      unresolvedQuotationMark.isDepthPossible(QuotationDepth.Primary)
    ) {
      return true;
    }

    if (this.deepestOpenQuoteContinuer === null) {
      return false;
    }

    if (
      this.deepestOpenQuote.depth.isDeeperThan(this.deepestOpenQuoteContinuer.depth) &&
      unresolvedQuotationMark.isDepthPossible(this.deepestOpenQuoteContinuer.depth.deeper())
    ) {
      return true;
    }

    return false;
  }

  private resolveAsQuoteContinuer(unresolvedQuotationMark: UnresolvedQuoteMetadata): QuoteMetadata {
    let quotationMarkDepth = QuotationDepth.Primary;
    if (
      (this.deepestOpenQuoteContinuer === null ||
        // Quote continuers for multiple levels must be consecutive
        !arePunctuationMarksConsecutive(
          this.deepestOpenQuoteContinuer,
          unresolvedQuotationMark.asPunctuationMetadata(),
        )) &&
      unresolvedQuotationMark.isDepthPossible(QuotationDepth.Primary)
    ) {
      quotationMarkDepth = QuotationDepth.Primary;
    }

    if (
      this.deepestOpenQuote !== null &&
      this.deepestOpenQuoteContinuer !== null &&
      this.deepestOpenQuote.depth.isDeeperThan(this.deepestOpenQuoteContinuer.depth) &&
      unresolvedQuotationMark.isDepthPossible(this.deepestOpenQuoteContinuer.depth.deeper())
    ) {
      quotationMarkDepth = this.deepestOpenQuoteContinuer.depth.deeper();
    }

    // English-style quote continuers should be marked as "Opening" and
    // Spanish-style quote continuers should be marked as "Closing"
    let quotationMarkDirection;
    if (this.quoteContinuerStyle === QuoteContinuerStyle.Spanish) {
      quotationMarkDirection = PairedPunctuationDirection.Closing;
      if (!unresolvedQuotationMark.isDirectionPossible(PairedPunctuationDirection.Closing)) {
        quotationMarkDirection = PairedPunctuationDirection.Opening;
      }
    } else {
      quotationMarkDirection = PairedPunctuationDirection.Opening;
      if (!unresolvedQuotationMark.isDirectionPossible(PairedPunctuationDirection.Opening)) {
        quotationMarkDirection = PairedPunctuationDirection.Closing;
      }
    }

    return unresolvedQuotationMark.resolve(quotationMarkDepth, quotationMarkDirection, true);
  }
}

interface DepthAndDirectionPreference {
  depth: QuotationDepth;
  direction: PairedPunctuationDirection;
}

export interface MissingQuoteContinuerMetadata extends QuoteMetadata {
  missingQuoteContinuers: string;
}

export class QuotationAnalysis {
  private unmatchedQuotes: QuoteMetadata[] = [];
  private incorrectlyNestedQuotes: QuoteMetadata[] = [];
  private ambiguousQuoteCorrections: QuoteCorrection[] = [];
  private tooDeeplyNestedQuotes: QuoteMetadata[] = [];
  private missingQuoteContinuers: MissingQuoteContinuerMetadata[] = [];

  addUnmatchedQuote(quote: QuoteMetadata): void {
    this.unmatchedQuotes.push(quote);
  }

  addIncorrectlyNestedQuote(quote: QuoteMetadata): void {
    this.incorrectlyNestedQuotes.push(quote);
  }

  addAmbiguousQuoteCorrection(quoteCorrection: QuoteCorrection): void {
    this.ambiguousQuoteCorrections.push(quoteCorrection);
  }

  addTooDeeplyNestedQuote(quote: QuoteMetadata): void {
    this.tooDeeplyNestedQuotes.push(quote);
  }

  addMissingQuoteContinuer(missingQuoteContinuer: MissingQuoteContinuerMetadata): void {
    this.missingQuoteContinuers.push(missingQuoteContinuer);
  }

  public getUnmatchedQuotes(): QuoteMetadata[] {
    return this.unmatchedQuotes;
  }

  public getIncorrectlyNestedQuotes(): QuoteMetadata[] {
    return this.incorrectlyNestedQuotes;
  }

  public getAmbiguousQuoteCorrections(): QuoteCorrection[] {
    return this.ambiguousQuoteCorrections;
  }

  public getTooDeeplyNestedQuotes(): QuoteMetadata[] {
    return this.tooDeeplyNestedQuotes;
  }

  public getMissingQuoteContinuers(): MissingQuoteContinuerMetadata[] {
    return this.missingQuoteContinuers;
  }
}

export const _privateTestingClasses = {
  QuotationResolver,
};
