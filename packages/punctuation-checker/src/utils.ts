import { Range, ScriptureDocument, ScriptureNode, ScriptureNodeType, TextDocument } from '@sillsdev/lynx';

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
  Opening = 1,
  Closing = 2,
  Ambiguous = 3,
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

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  public doesStringMatchIgnoringContext(str: string): boolean {
    return this.centerContentMatcher.test(str);
  }

  public doesContextMatch(leftContext: string, rightContext: string): boolean {
    return this.leftContextMatcher.test(leftContext) && this.rightContextMatcher.test(rightContext);
  }

  public doesStringAndContextMatch(str: string, leftContext: string, rightContext: string): boolean {
    return this.doesStringMatchIgnoringContext(str) && this.doesContextMatch(leftContext, rightContext);
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

export class TextSegment {
  constructor(
    private readonly text: string,
    private readonly range?: Range,
  ) {}

  public getText(): string {
    return this.text;
  }

  public hasRange(): boolean {
    return this.range !== undefined;
  }

  public getRange(): Range {
    if (this.range === undefined) {
      throw new Error("Tried to get a Range from a TextSegment that doesn't have one");
    }
    return this.range;
  }
}

export class ScriptureNodeGrouper {
  private readonly nonVerseNodes: ScriptureNode[] = [];
  private readonly verseNodes: ScriptureNode[] = [];

  constructor(allNodes: IterableIterator<ScriptureNode>) {
    for (const node of allNodes) {
      if (this.isVerseNode(node)) {
        this.verseNodes.push(node);
      } else {
        this.nonVerseNodes.push(node);
      }
    }
  }

  private isVerseNode(node: ScriptureNode): boolean {
    for (const sibling of node.parent?.children ?? []) {
      if (sibling.type === ScriptureNodeType.Verse) {
        return true;
      }
    }
    return false;
  }

  public getVerseNodes(): ScriptureNode[] {
    return this.verseNodes;
  }

  public getNonVerseNodes(): ScriptureNode[] {
    return this.nonVerseNodes;
  }
}

export function isScriptureDocument(document: TextDocument | ScriptureDocument): document is ScriptureDocument {
  return 'findNodes' in document;
}
