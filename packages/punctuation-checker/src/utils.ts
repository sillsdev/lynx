import { Range, ScriptureDocument, TextDocument } from '@sillsdev/lynx';

export interface PunctuationMetadata {
  startIndex: number;
  endIndex: number;
  enclosingRange: Range | undefined;
  text: string;
}

export interface PairedPunctuationMetadata extends PunctuationMetadata {
  direction: PairedPunctuationDirection;
}

export enum PairedPunctuationDirection {
  Opening = 'Opening',
  Closing = 'Closing',
  Ambiguous = 'Ambiguous',
}

export enum ContextDirection {
  Left,
  Right,
}

export class CharacterClassRegexBuilder {
  private characterClass = '';
  private isGlobal = false;

  public addCharacter(character: string): this {
    character = this.escapeCharacterIfNecessary(character);
    this.characterClass += character;
    return this;
  }

  private escapeCharacterIfNecessary(character: string): string {
    if (character === '-') {
      return '\\-';
    }
    if (character === ']') {
      return '\\]';
    }
    if (character === '\\') {
      return '\\\\';
    }
    return character;
  }

  public addCharacters(characters: string[]): this {
    for (const character of characters) {
      this.addCharacter(character);
    }
    return this;
  }

  public addRange(startingCharacter: string, endingCharacter: string): this {
    this.characterClass += startingCharacter + '-' + endingCharacter;
    return this;
  }

  public makeGlobal(): this {
    this.isGlobal = true;
    return this;
  }

  public build(): RegExp {
    return new RegExp('[' + this.characterClass + ']', this.isGlobal ? 'ug' : 'u');
  }
}

// A matcher for a string with context on both the left and the right
export class StringContextMatcher {
  private centerContentMatcher = /./;
  private leftContextMatcher = /./;
  private rightContextMatcher = /./;

  // Private constructor so that the class can only be instantiated through the Builder
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  public doesStringMatchIgnoringContext(str: string): boolean {
    return this.centerContentMatcher.test(str);
  }

  public doesContextMatch(leftContext: string, rightContext: string): boolean {
    return this.doesLeftContextMatch(leftContext) && this.doesRightContextMatch(rightContext);
  }

  private doesLeftContextMatch(leftContext: string): boolean {
    return this.leftContextMatcher.test(leftContext);
  }

  private doesRightContextMatch(rightContext: string): boolean {
    return this.rightContextMatcher.test(rightContext);
  }

  public doesStringAndContextMatch(str: string, leftContext: string, rightContext: string): boolean {
    return this.doesStringMatchIgnoringContext(str) && this.doesContextMatch(leftContext, rightContext);
  }

  public doesStringAndLeftContextMatch(str: string, leftContext: string): boolean {
    return this.doesStringMatchIgnoringContext(str) && this.doesLeftContextMatch(leftContext);
  }

  public static Builder = class {
    readonly stringContextMatcher: StringContextMatcher = new StringContextMatcher();

    public setCenterContent(centerContent: RegExp): this {
      this.stringContextMatcher.centerContentMatcher = centerContent;
      return this;
    }

    public setLeftContext(leftContext: RegExp): this {
      this.stringContextMatcher.leftContextMatcher = leftContext;
      return this;
    }

    public setRightContext(rightContext: RegExp): this {
      this.stringContextMatcher.rightContextMatcher = rightContext;
      return this;
    }

    public build(): StringContextMatcher {
      return this.stringContextMatcher;
    }
  };
}

export function isScriptureDocument(document: TextDocument | ScriptureDocument): document is ScriptureDocument {
  return 'findNodes' in document;
}
