import { PairedPunctuationRule } from '../rule-set/rule-utils';
import { CharacterClassRegexBuilder } from '../utils';

export class PairedPunctuationConfig {
  private readonly standardRules: PairedPunctuationRule[] = [];
  private readonly quotationRules: PairedPunctuationRule[] = [];
  private openingMarkRegex = /[([{]/;
  private closingMarkRegex = /[)}\]]/;
  private correspondingMarkMap: Map<string, string> = new Map<string, string>();
  private quotationMarks: Set<string> = new Set<string>();

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  private intializeAfterBuilding(): void {
    this.openingMarkRegex = this.createOpeningMarkRegex();
    this.closingMarkRegex = this.createClosingMarkRegex();
    this.correspondingMarkMap = this.createCorrespondingMarkMap();
    this.quotationMarks = this.createQuotationMarkSet();
  }

  private createOpeningMarkRegex(): RegExp {
    const quoteRegexBuilder: CharacterClassRegexBuilder = new CharacterClassRegexBuilder();
    for (const punctuationPair of this.standardRules) {
      quoteRegexBuilder.addCharacter(punctuationPair.openingPunctuationMark);
    }
    for (const punctuationPair of this.quotationRules) {
      quoteRegexBuilder.addCharacter(punctuationPair.openingPunctuationMark);
    }
    return quoteRegexBuilder.build();
  }

  private createClosingMarkRegex(): RegExp {
    const quoteRegexBuilder: CharacterClassRegexBuilder = new CharacterClassRegexBuilder();
    for (const punctuationPair of this.standardRules) {
      quoteRegexBuilder.addCharacter(punctuationPair.closingPunctuationMark);
    }
    for (const punctuationPair of this.quotationRules) {
      quoteRegexBuilder.addCharacter(punctuationPair.closingPunctuationMark);
    }
    return quoteRegexBuilder.build();
  }

  private createCorrespondingMarkMap(): Map<string, string> {
    const correspondingMarkMap: Map<string, string> = new Map<string, string>();
    for (const rule of this.standardRules) {
      correspondingMarkMap.set(rule.openingPunctuationMark, rule.closingPunctuationMark);
      correspondingMarkMap.set(rule.closingPunctuationMark, rule.openingPunctuationMark);
    }
    for (const rule of this.quotationRules) {
      correspondingMarkMap.set(rule.openingPunctuationMark, rule.closingPunctuationMark);
      correspondingMarkMap.set(rule.closingPunctuationMark, rule.openingPunctuationMark);
    }
    return correspondingMarkMap;
  }

  private createQuotationMarkSet(): Set<string> {
    const quotationMarkSet: Set<string> = new Set<string>();
    for (const rule of this.quotationRules) {
      quotationMarkSet.add(rule.openingPunctuationMark);
      quotationMarkSet.add(rule.closingPunctuationMark);
    }
    return quotationMarkSet;
  }

  public createAllPairedMarksRegex(): RegExp {
    const quoteRegexBuilder: CharacterClassRegexBuilder = new CharacterClassRegexBuilder();
    for (const punctuationPair of this.standardRules) {
      quoteRegexBuilder
        .addCharacter(punctuationPair.openingPunctuationMark)
        .addCharacter(punctuationPair.closingPunctuationMark);
    }
    for (const punctuationPair of this.quotationRules) {
      quoteRegexBuilder
        .addCharacter(punctuationPair.openingPunctuationMark)
        .addCharacter(punctuationPair.closingPunctuationMark);
    }
    return quoteRegexBuilder.makeGlobal().build();
  }

  public isOpeningMark(punctuationMark: string): boolean {
    return this.openingMarkRegex.test(punctuationMark);
  }

  public isClosingMark(punctuationMark: string): boolean {
    return this.closingMarkRegex.test(punctuationMark);
  }

  public doMarksConstituteAPair(openingMark: string, closingMark: string): boolean {
    return this.correspondingMarkMap.get(openingMark) === closingMark;
  }

  public findCorrespondingMark(punctuationMark: string): string | undefined {
    if (this.correspondingMarkMap.has(punctuationMark)) {
      return this.correspondingMarkMap.get(punctuationMark);
    }
    return undefined;
  }

  public shouldErrorForUnmatchedMarks(punctuationMark: string): boolean {
    return !this.quotationMarks.has(punctuationMark);
  }

  public static Builder = class {
    pairedPunctuationConfig: PairedPunctuationConfig = new PairedPunctuationConfig();

    public addRule(pairedPunctuationRule: PairedPunctuationRule): this {
      this.pairedPunctuationConfig.standardRules.push(pairedPunctuationRule);
      return this;
    }

    public addQuotationRule(pairedPunctuationRule: PairedPunctuationRule): this {
      this.pairedPunctuationConfig.quotationRules.push(pairedPunctuationRule);
      return this;
    }

    public build(): PairedPunctuationConfig {
      this.pairedPunctuationConfig.intializeAfterBuilding();
      return this.pairedPunctuationConfig;
    }
  };
}
