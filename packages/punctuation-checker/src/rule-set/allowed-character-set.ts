export interface AllowedCharacterSet {
  isCharacterAllowed(character: string): boolean;
}

export class CharacterRegexWhitelist implements AllowedCharacterSet {
  constructor(private readonly characterRegex: RegExp) {}

  isCharacterAllowed(character: string): boolean {
    return this.characterRegex.test(character);
  }
}
