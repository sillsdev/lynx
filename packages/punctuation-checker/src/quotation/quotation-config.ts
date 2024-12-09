import { AmbiguousPunctuationMap, PairedPunctuationRule } from '../rule-set/rule-utils';
import { CharacterClassRegexBuilder, PairedPunctuationDirection, StringContextMatcher } from '../utils';
import { QuotationDepth } from './quotation-utils';

export class QuotationConfig {
  private quotationLevels: PairedPunctuationRule[] = [];
  private ambiguousQuoteMap: AmbiguousPunctuationMap = new AmbiguousPunctuationMap();
  private quotationsToIgnore: StringContextMatcher[] = [];
  private nestingWarningDepth: QuotationDepth = QuotationDepth.fromNumber(4);
  private areContinuersAllowed = false;
  private openingQuoteRegex = /\u201C/;
  private closingQuoteRegex = /\u201D/;
  private ambiguousQuoteRegex = /"/;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  private intializeAfterBuilding(): void {
    this.openingQuoteRegex = this.createOpeningQuoteRegex();
    this.closingQuoteRegex = this.createClosingQuoteRegex();
    this.ambiguousQuoteRegex = this.createAmbiguousQuoteRegex();
  }

  private createOpeningQuoteRegex(): RegExp {
    const quoteRegexBuilder: CharacterClassRegexBuilder = new CharacterClassRegexBuilder();
    for (const punctuationPair of this.quotationLevels) {
      quoteRegexBuilder.addCharacter(punctuationPair.openingPunctuationMark);
    }
    return quoteRegexBuilder.build();
  }

  private createClosingQuoteRegex(): RegExp {
    const quoteRegexBuilder: CharacterClassRegexBuilder = new CharacterClassRegexBuilder();
    for (const punctuationPair of this.quotationLevels) {
      quoteRegexBuilder.addCharacter(punctuationPair.closingPunctuationMark);
    }
    return quoteRegexBuilder.build();
  }

  private createAmbiguousQuoteRegex(): RegExp {
    const quoteRegexBuilder: CharacterClassRegexBuilder = new CharacterClassRegexBuilder();
    for (const ambiguousQuote of this.ambiguousQuoteMap.getAmbiguousMarks()) {
      quoteRegexBuilder.addCharacter(ambiguousQuote);
    }
    return quoteRegexBuilder.build();
  }

  public createAllQuotesRegex(): RegExp {
    const quoteRegexBuilder: CharacterClassRegexBuilder = new CharacterClassRegexBuilder();
    for (const punctuationPair of this.quotationLevels) {
      quoteRegexBuilder
        .addCharacter(punctuationPair.openingPunctuationMark)
        .addCharacter(punctuationPair.closingPunctuationMark);
    }
    for (const ambiguousQuote of this.ambiguousQuoteMap.getAmbiguousMarks()) {
      quoteRegexBuilder.addCharacter(ambiguousQuote);
    }
    return quoteRegexBuilder.makeGlobal().build();
  }

  public createAmbiguousQuotationMarkSet(): Set<string> {
    return new Set<string>(this.ambiguousQuoteMap.getAmbiguousMarks());
  }

  public getPossibleQuoteDirections(quotationMark: string): PairedPunctuationDirection[] {
    const directions: Set<PairedPunctuationDirection> = new Set<PairedPunctuationDirection>();
    if (this.openingQuoteRegex.test(quotationMark)) {
      directions.add(PairedPunctuationDirection.Opening);
    }
    if (this.closingQuoteRegex.test(quotationMark)) {
      directions.add(PairedPunctuationDirection.Closing);
    }
    if (this.ambiguousQuoteRegex.test(quotationMark)) {
      for (const unambiguousMark of this.ambiguousQuoteMap.lookUpAmbiguousMark(quotationMark)) {
        for (const direction of this.getPossibleQuoteDirections(unambiguousMark)) {
          directions.add(direction);
        }
      }
    }
    return Array.from(directions);
  }

  // We assume that a quotation mark can never be an opening mark at one depth
  // and a closing mark at another depth
  public getPossibleQuoteDepths(quotationMark: string): QuotationDepth[] {
    const depths: Set<number> = new Set<number>();
    let depth = 1;
    for (const quotePair of this.quotationLevels) {
      if (quotePair.openingPunctuationMark === quotationMark || quotePair.closingPunctuationMark === quotationMark) {
        depths.add(depth);
      }
      depth++;
    }
    if (this.ambiguousQuoteRegex.test(quotationMark)) {
      for (const unambiguousMark of this.ambiguousQuoteMap.lookUpAmbiguousMark(quotationMark)) {
        for (const quoteDepth of this.getPossibleQuoteDepths(unambiguousMark)) {
          depths.add(quoteDepth.asNumber()); // mapping to number because Set doesn't work for objects
        }
      }
    }
    return Array.from(depths).map((depth) => QuotationDepth.fromNumber(depth));
  }

  public isQuoteAutocorrectable(quotationMark: string): boolean {
    return this.ambiguousQuoteRegex.test(quotationMark);
  }

  public getUnambiguousQuotationMarkByType(
    depth: QuotationDepth,
    direction: PairedPunctuationDirection,
  ): string | undefined {
    if (depth.asNumber() > this.quotationLevels.length) {
      return undefined;
    }

    const unambiguousMark: string =
      direction === PairedPunctuationDirection.Opening
        ? this.quotationLevels[depth.asNumber() - 1].openingPunctuationMark
        : this.quotationLevels[depth.asNumber() - 1].closingPunctuationMark;
    return unambiguousMark;
  }

  public isQuotationMarkPotentiallyIgnoreable(quotationMark: string): boolean {
    for (const quotationToIgnore of this.quotationsToIgnore) {
      if (quotationToIgnore.doesStringMatchIgnoringContext(quotationMark)) {
        return true;
      }
    }
    return false;
  }

  public shouldIgnoreQuotationMark(quotationMark: string, leftContext: string, rightContext: string): boolean {
    for (const quotationToIgnore of this.quotationsToIgnore) {
      if (quotationToIgnore.doesStringAndContextMatch(quotationMark, leftContext, rightContext)) {
        return true;
      }
    }
    return false;
  }

  public shouldWarnForDepth(depth: QuotationDepth): boolean {
    return depth.isDeeperThan(this.nestingWarningDepth) || depth.equals(this.nestingWarningDepth);
  }

  public shouldAllowContinuers(): boolean {
    return this.areContinuersAllowed;
  }

  public static Builder = class {
    readonly quotationConfig: QuotationConfig = new QuotationConfig();

    public setTopLevelQuotationMarks(quotationPairConfig: PairedPunctuationRule): this {
      if (this.quotationConfig.quotationLevels.length > 0) {
        this.quotationConfig.quotationLevels[0] = quotationPairConfig;
      }

      this.quotationConfig.quotationLevels.push(quotationPairConfig);
      return this;
    }

    public addNestedQuotationMarks(quotationPairConfig: PairedPunctuationRule): this {
      if (this.quotationConfig.quotationLevels.length === 0) {
        throw new Error('You must set the top-level quotation marks before adding next quotation marks.');
      }

      this.quotationConfig.quotationLevels.push(quotationPairConfig);
      return this;
    }

    public mapAmbiguousQuotationMark(ambiguousMark: string, unambiguousMark: string): this {
      this.quotationConfig.ambiguousQuoteMap.mapAmbiguousPunctuation(ambiguousMark, unambiguousMark);
      return this;
    }

    public setNestingWarningDepth(nestingWarningDepth: QuotationDepth): this {
      this.quotationConfig.nestingWarningDepth = nestingWarningDepth;
      return this;
    }

    public allowContinuers(): this {
      this.quotationConfig.areContinuersAllowed = true;
      throw new Error('Quote continuers are not supported at this time.');
    }

    public disallowContinuers(): this {
      this.quotationConfig.areContinuersAllowed = false;
      return this;
    }

    public ignoreMatchingQuotationMarks(quotationContextMatcher: StringContextMatcher): this {
      this.quotationConfig.quotationsToIgnore.push(quotationContextMatcher);
      return this;
    }

    public build(): QuotationConfig {
      this.quotationConfig.intializeAfterBuilding();
      return this.quotationConfig;
    }
  };
}
