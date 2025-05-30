import { CharacterClassRegexBuilder, StringContextMatcher } from '../utils';

export class PunctuationContextConfig {
  private rulesByPunctuationMark: Map<string, StringContextMatcher[]> = new Map<string, StringContextMatcher[]>();

  public createPunctuationRegex(): RegExp {
    const regexBuilder: CharacterClassRegexBuilder = new CharacterClassRegexBuilder();
    for (const punctuationMark of this.rulesByPunctuationMark.keys()) {
      regexBuilder.addCharacter(punctuationMark);
    }
    return regexBuilder.makeGlobal().build();
  }

  public isLeadingContextCorrect(punctuationMark: string, leftContext: string): boolean {
    if (!this.rulesByPunctuationMark.has(punctuationMark)) {
      return true;
    }
    for (const rule of this.rulesByPunctuationMark.get(punctuationMark) ?? []) {
      if (!rule.isLeftContextDefined()) {
        continue;
      }
      if (rule.doesStringAndLeftContextMatch(punctuationMark, leftContext)) {
        return false;
      }
    }
    return true;
  }

  public isTrailingContextCorrect(punctuationMark: string, rightContext: string): boolean {
    if (!this.rulesByPunctuationMark.has(punctuationMark)) {
      return true;
    }
    for (const rule of this.rulesByPunctuationMark.get(punctuationMark) ?? []) {
      if (!rule.isRightContextDefined()) {
        continue;
      }
      if (rule.doesStringAndRightContextMatch(punctuationMark, rightContext)) {
        return false;
      }
    }
    return true;
  }

  public static Builder = class {
    readonly punctuationContextConfig: PunctuationContextConfig = new PunctuationContextConfig();

    public addProhibitedLeadingPattern(punctuationMarks: string[], leftContextPattern: RegExp): this {
      for (const punctuationMark of punctuationMarks) {
        if (!this.punctuationContextConfig.rulesByPunctuationMark.has(punctuationMark)) {
          this.punctuationContextConfig.rulesByPunctuationMark.set(punctuationMark, []);
        }
        this.punctuationContextConfig.rulesByPunctuationMark
          .get(punctuationMark)
          ?.push(
            new StringContextMatcher.Builder()
              .setCenterContent(new CharacterClassRegexBuilder().addCharacter(punctuationMark).build())
              .setLeftContext(leftContextPattern)
              .build(),
          );
      }
      return this;
    }

    public addProhibitedTrailingPattern(punctuationMarks: string[], rightContextPattern: RegExp): this {
      for (const punctuationMark of punctuationMarks) {
        if (!this.punctuationContextConfig.rulesByPunctuationMark.has(punctuationMark)) {
          this.punctuationContextConfig.rulesByPunctuationMark.set(punctuationMark, []);
        }
        this.punctuationContextConfig.rulesByPunctuationMark
          .get(punctuationMark)
          ?.push(
            new StringContextMatcher.Builder()
              .setCenterContent(new CharacterClassRegexBuilder().addCharacter(punctuationMark).build())
              .setRightContext(rightContextPattern)
              .build(),
          );
      }
      return this;
    }

    public addProhibitedBidirectionalPattern(
      punctuationMarks: string[],
      leftContextPattern: RegExp,
      rightContextPattern: RegExp,
    ): this {
      for (const punctuationMark of punctuationMarks) {
        if (!this.punctuationContextConfig.rulesByPunctuationMark.has(punctuationMark)) {
          this.punctuationContextConfig.rulesByPunctuationMark.set(punctuationMark, []);
        }
        this.punctuationContextConfig.rulesByPunctuationMark
          .get(punctuationMark)
          ?.push(
            new StringContextMatcher.Builder()
              .setCenterContent(new CharacterClassRegexBuilder().addCharacter(punctuationMark).build())
              .setLeftContext(leftContextPattern)
              .setRightContext(rightContextPattern)
              .build(),
          );
      }
      return this;
    }

    public build(): PunctuationContextConfig {
      return this.punctuationContextConfig;
    }
  };
}
