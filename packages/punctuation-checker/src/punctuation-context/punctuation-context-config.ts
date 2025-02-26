import { CharacterClassRegexBuilder, ContextDirection } from '../utils';

export class PunctuationContextConfig {
  private rulesByPunctuationMark: Map<string, BidirectionalContextRule> = new Map<string, BidirectionalContextRule>();

  public createPunctuationRegex(): RegExp {
    const regexBuilder: CharacterClassRegexBuilder = new CharacterClassRegexBuilder();
    for (const punctuationMark of this.rulesByPunctuationMark.keys()) {
      regexBuilder.addCharacter(punctuationMark);
    }
    return regexBuilder.makeGlobal().build();
  }

  public isLeadingContextCorrect(punctuationMark: string, leftContext: string): boolean {
    return this.rulesByPunctuationMark.get(punctuationMark)?.isLeadingContextCorrect(leftContext) ?? true;
  }

  public isTrailingContextCorrect(punctuationMark: string, rightContext: string): boolean {
    return this.rulesByPunctuationMark.get(punctuationMark)?.isTrailingContextCorrect(rightContext) ?? true;
  }

  public getAllowableLeadingCharacters(punctuationMark: string): AcceptableCharacterSet {
    if (this.rulesByPunctuationMark.has(punctuationMark)) {
      return (
        this.rulesByPunctuationMark.get(punctuationMark)?.getAllowableCharactersByDirection(ContextDirection.Left) ??
        new AcceptableCharacterSet()
      );
    }
    return new AcceptableCharacterSet();
  }

  public getAllowableTrailingCharacters(punctuationMark: string): AcceptableCharacterSet {
    if (this.rulesByPunctuationMark.has(punctuationMark)) {
      return (
        this.rulesByPunctuationMark.get(punctuationMark)?.getAllowableCharactersByDirection(ContextDirection.Right) ??
        new AcceptableCharacterSet()
      );
    }
    return new AcceptableCharacterSet();
  }

  public static Builder = class {
    readonly punctuationContextConfig: PunctuationContextConfig = new PunctuationContextConfig();

    public addAcceptableContextCharacters(
      contextDirection: ContextDirection,
      punctuationMarks: string[],
      acceptableContextCharacters: string[],
    ): this {
      for (const punctuationMark of punctuationMarks) {
        this.addAcceptableContextCharactersForPunctuationMark(
          contextDirection,
          punctuationMark,
          acceptableContextCharacters,
        );
      }
      return this;
    }

    public addAcceptableContextCharactersForPunctuationMark(
      contextDirection: ContextDirection,
      punctuationMark: string,
      acceptableContextCharacters: string[],
    ): this {
      if (!this.punctuationContextConfig.rulesByPunctuationMark.has(punctuationMark)) {
        this.punctuationContextConfig.rulesByPunctuationMark.set(punctuationMark, new BidirectionalContextRule());
      }
      this.punctuationContextConfig.rulesByPunctuationMark
        .get(punctuationMark)
        ?.addAcceptableCharacters(contextDirection, acceptableContextCharacters);
      return this;
    }

    public prohibitWhitespaceForCharacters(contextDirection: ContextDirection, punctuationMarks: string[]): this {
      for (const punctuationMark of punctuationMarks) {
        this.prohibitWhitespaceForPunctuationMark(contextDirection, punctuationMark);
      }
      return this;
    }

    public prohibitWhitespaceForPunctuationMark(contextDirection: ContextDirection, punctuationMark: string): this {
      if (!this.punctuationContextConfig.rulesByPunctuationMark.has(punctuationMark)) {
        this.punctuationContextConfig.rulesByPunctuationMark.set(punctuationMark, new BidirectionalContextRule());
      }
      this.punctuationContextConfig.rulesByPunctuationMark
        .get(punctuationMark)
        ?.addProhibitedWhitespaceDirection(contextDirection);

      return this;
    }

    public build(): PunctuationContextConfig {
      return this.punctuationContextConfig;
    }
  };
}

class BidirectionalContextRule {
  private acceptableCharactersByDirection: Map<ContextDirection, AcceptableCharacterSet> = new Map<
    ContextDirection,
    AcceptableCharacterSet
  >();
  private prohibitedWhitespaceDirections: Set<ContextDirection> = new Set<ContextDirection>();
  private static whitespaceRegex = new RegExp('\\s', 'u');

  addAcceptableCharacters(contextDirection: ContextDirection, acceptableCharacters: string[]): void {
    if (!this.acceptableCharactersByDirection.has(contextDirection)) {
      this.acceptableCharactersByDirection.set(contextDirection, new AcceptableCharacterSet());
    }
    for (const acceptableCharacter of acceptableCharacters) {
      this.acceptableCharactersByDirection.get(contextDirection)?.addAcceptableCharacter(acceptableCharacter);
    }
  }

  addProhibitedWhitespaceDirection(contextDirection: ContextDirection): void {
    this.prohibitedWhitespaceDirections.add(contextDirection);
  }

  getAllowableCharactersByDirection(direction: ContextDirection): AcceptableCharacterSet {
    if (this.acceptableCharactersByDirection.has(direction)) {
      return this.acceptableCharactersByDirection.get(direction) ?? new AcceptableCharacterSet();
    }
    return new AcceptableCharacterSet();
  }

  // Whitespace prohibitions take precedence over lists of acceptable characters
  isLeadingContextCorrect(leftContext: string): boolean {
    if (
      this.prohibitedWhitespaceDirections.has(ContextDirection.Left) &&
      BidirectionalContextRule.whitespaceRegex.test(leftContext)
    ) {
      return false;
    }
    if (
      this.acceptableCharactersByDirection.has(ContextDirection.Left) &&
      !this.acceptableCharactersByDirection.get(ContextDirection.Left)?.isCharacterInSet(leftContext)
    ) {
      return false;
    }
    return true;
  }

  isTrailingContextCorrect(rightContext: string): boolean {
    if (
      this.prohibitedWhitespaceDirections.has(ContextDirection.Right) &&
      BidirectionalContextRule.whitespaceRegex.test(rightContext)
    ) {
      return false;
    }
    if (
      this.acceptableCharactersByDirection.has(ContextDirection.Right) &&
      !this.acceptableCharactersByDirection.get(ContextDirection.Right)?.isCharacterInSet(rightContext)
    ) {
      return false;
    }
    return true;
  }
}

export class AcceptableCharacterSet {
  private readonly acceptableCharacters: Set<string> = new Set<string>();

  addAcceptableCharacter(acceptableCharacter: string): void {
    this.acceptableCharacters.add(acceptableCharacter);
  }

  isCharacterInSet(character: string): boolean {
    return this.acceptableCharacters.has(character);
  }
}
