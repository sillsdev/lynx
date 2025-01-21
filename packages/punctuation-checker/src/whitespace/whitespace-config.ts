import { CharacterClassRegexBuilder, ContextDirection } from '../utils';

export class WhitespaceConfig {
  private rulesByPunctuationMark: Map<string, BidirectionalWhitespaceRule> = new Map<
    string,
    BidirectionalWhitespaceRule
  >();

  public createPunctuationRegex(): RegExp {
    const regexBuilder: CharacterClassRegexBuilder = new CharacterClassRegexBuilder();
    for (const punctuationMark of this.rulesByPunctuationMark.keys()) {
      regexBuilder.addCharacter(punctuationMark);
    }
    return regexBuilder.makeGlobal().build();
  }

  public isLeadingWhitespaceCorrect(punctuationMark: string, leftContext: string): boolean {
    return this.rulesByPunctuationMark.get(punctuationMark)?.isLeadingWhitespaceCorrect(leftContext) ?? true;
  }

  public isTrailingWhitespaceCorrect(punctuationMark: string, rightContext: string): boolean {
    return this.rulesByPunctuationMark.get(punctuationMark)?.isTrailingWhitespaceCorrect(rightContext) ?? true;
  }

  public static Builder = class {
    readonly whitespaceConfig: WhitespaceConfig = new WhitespaceConfig();

    public addRequiredWhitespaceRule(
      contextDirection: ContextDirection,
      punctuationMarks: string[],
      acceptableWhitespaceCharacters: string[],
    ): this {
      for (const punctuationMark of punctuationMarks) {
        if (!this.whitespaceConfig.rulesByPunctuationMark.has(punctuationMark)) {
          this.whitespaceConfig.rulesByPunctuationMark.set(punctuationMark, new BidirectionalWhitespaceRule());
        }
        this.whitespaceConfig.rulesByPunctuationMark
          .get(punctuationMark)
          ?.addAcceptableWhitespaceCharacters(contextDirection, acceptableWhitespaceCharacters);
      }
      return this;
    }

    public addProhibitedWhitespaceRule(contextDirection: ContextDirection, punctuationMarks: string[]): this {
      for (const punctuationMark of punctuationMarks) {
        if (!this.whitespaceConfig.rulesByPunctuationMark.has(punctuationMark)) {
          this.whitespaceConfig.rulesByPunctuationMark.set(punctuationMark, new BidirectionalWhitespaceRule());
        }
        this.whitespaceConfig.rulesByPunctuationMark
          .get(punctuationMark)
          ?.addProhibitedWhitespaceDirection(contextDirection);
      }
      return this;
    }

    public build(): WhitespaceConfig {
      return this.whitespaceConfig;
    }
  };
}

class BidirectionalWhitespaceRule {
  // Whitespace prohibitions take precedence over lists of acceptable whitespace
  private acceptableWhitespaceByDirection: Map<ContextDirection, WhitespaceCharacterSet> = new Map<
    ContextDirection,
    WhitespaceCharacterSet
  >();
  private prohibitedWhitespaceDirections: Set<ContextDirection> = new Set<ContextDirection>();
  private static whitespaceRegex = new RegExp('\\s', 'u');

  addAcceptableWhitespaceCharacters(
    contextDirection: ContextDirection,
    acceptableWhitespaceCharacters: string[],
  ): void {
    if (!this.acceptableWhitespaceByDirection.has(contextDirection)) {
      this.acceptableWhitespaceByDirection.set(contextDirection, new WhitespaceCharacterSet());
    }
    for (const whitespaceCharacter of acceptableWhitespaceCharacters) {
      this.acceptableWhitespaceByDirection.get(contextDirection)?.addWhitespaceCharacter(whitespaceCharacter);
    }
  }

  addProhibitedWhitespaceDirection(contextDirection: ContextDirection): void {
    this.prohibitedWhitespaceDirections.add(contextDirection);
  }

  isLeadingWhitespaceCorrect(leftContext: string): boolean {
    if (
      this.prohibitedWhitespaceDirections.has(ContextDirection.Left) &&
      BidirectionalWhitespaceRule.whitespaceRegex.test(leftContext)
    ) {
      return false;
    }
    if (
      this.acceptableWhitespaceByDirection.has(ContextDirection.Left) &&
      !this.acceptableWhitespaceByDirection.get(ContextDirection.Left)?.isCharacterInSet(leftContext)
    ) {
      return false;
    }
    return true;
  }

  isTrailingWhitespaceCorrect(rightContext: string): boolean {
    if (
      this.prohibitedWhitespaceDirections.has(ContextDirection.Right) &&
      BidirectionalWhitespaceRule.whitespaceRegex.test(rightContext)
    ) {
      return false;
    }
    if (
      this.acceptableWhitespaceByDirection.has(ContextDirection.Right) &&
      !this.acceptableWhitespaceByDirection.get(ContextDirection.Right)?.isCharacterInSet(rightContext)
    ) {
      return false;
    }
    return true;
  }
}

class WhitespaceCharacterSet {
  private readonly whitespaceCharacters: Set<string> = new Set<string>();

  public addWhitespaceCharacter(whitespaceCharacter: string): void {
    this.whitespaceCharacters.add(whitespaceCharacter);
  }

  public isCharacterInSet(whitespaceCharacter: string): boolean {
    return this.whitespaceCharacters.has(whitespaceCharacter);
  }
}
