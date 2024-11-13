export interface AllowedCharacterSet {
  isCharacterAllowed(character: string): boolean;
}

export class CharacterRegexWhitelist implements AllowedCharacterSet {
  private readonly characterRegex;

  constructor(characterRegex: RegExp) {
    this.characterRegex = new RegExp('^' + characterRegex.source + '$', characterRegex.flags);
  }

  public isCharacterAllowed(character: string): boolean {
    return this.characterRegex.test(character);
  }
}
