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

export class ScriptureNodeGroup implements Iterable<ScriptureNode> {
  private constructor(private readonly nodes: ScriptureNode[]) {}

  public static createEmptyGroup(): ScriptureNodeGroup {
    return new ScriptureNodeGroup([]);
  }

  public static createFromNodes(nodes: ScriptureNode[]): ScriptureNodeGroup {
    return new ScriptureNodeGroup(nodes);
  }

  public add(scriptureNode: ScriptureNode): void {
    this.nodes.push(scriptureNode);
  }

  public size(): number {
    return this.nodes.length;
  }

  public nodeAtIndex(index: number): ScriptureNode {
    if (index < 0 && index >= this.size()) {
      throw new Error(`Index ${index.toString()} is out of bounds when calling ScriptureNodeGroup.get(index)`);
    }
    return this.nodes[index];
  }

  [Symbol.iterator]() {
    return new ScriptureNodeIterator(this.nodes);
  }

  public toTextSegmentArray(): TextSegment[] {
    return this.nodes.map((x) => new TextSegment(x.getText(), x.range));
  }
}

class ScriptureNodeIterator implements Iterator<ScriptureNode> {
  private currentIndex = 0;

  constructor(private readonly nodeArray: ScriptureNode[]) {}

  next(): IteratorResult<ScriptureNode> {
    if (this.currentIndex < this.nodeArray.length) {
      return {
        done: false,
        value: this.nodeArray[this.currentIndex++],
      };
    }
    return {
      done: true,
      value: undefined,
    };
  }
}

export class ScriptureTextNodeGrouper {
  private standaloneNodes: ScriptureNode[] = [];
  private nonVerseNodeGroups: ScriptureNodeGroup[] = [];
  private verseNodes: ScriptureNodeGroup = ScriptureNodeGroup.createEmptyGroup();
  private firstVerseNode: ScriptureNode | undefined = undefined;

  private static prohibitedVerseAncestorTypes: Set<ScriptureNodeType> = new Set<ScriptureNodeType>([
    ScriptureNodeType.Note,
    ScriptureNodeType.Cell,
    ScriptureNodeType.Row,
    ScriptureNodeType.Table,
    ScriptureNodeType.Sidebar,
    ScriptureNodeType.Ref,
  ]);

  constructor(scriptureDocument: ScriptureDocument) {
    this.groupNodes(scriptureDocument);
  }

  private groupNodes(scriptureDocument: ScriptureDocument): void {
    const topLevelTextNodes: ScriptureNode[] = [];
    this.processNode(scriptureDocument, topLevelTextNodes);

    this.verseNodes = ScriptureNodeGroup.createFromNodes(topLevelTextNodes);
  }

  private processNode(node: ScriptureNode, currentGroup: ScriptureNode[]): void {
    if (node.type === ScriptureNodeType.Text) {
      if (this.firstVerseNode === undefined) {
        this.standaloneNodes.push(node);
      } else {
        currentGroup.push(node);
      }
    }

    if (node.type === ScriptureNodeType.Verse && this.firstVerseNode === undefined) {
      this.firstVerseNode = node;
    }

    if (ScriptureTextNodeGrouper.prohibitedVerseAncestorTypes.has(node.type)) {
      // create a new group of nodes
      const newNodeGroup: ScriptureNode[] = [];
      for (const child of node.children) {
        this.processNode(child, newNodeGroup);
      }
      if (newNodeGroup.length > 0) {
        this.nonVerseNodeGroups.push(ScriptureNodeGroup.createFromNodes(newNodeGroup));
      }
    } else {
      for (const child of node.children) {
        this.processNode(child, currentGroup);
      }
    }
  }

  public getVerseNodeGroup(): ScriptureNodeGroup {
    return this.verseNodes;
  }

  public getNonVerseNodeGroups(): ScriptureNodeGroup[] {
    return this.nonVerseNodeGroups;
  }

  public getStandAloneNodes(): ScriptureNode[] {
    return this.standaloneNodes;
  }
}

export function isScriptureDocument(document: TextDocument | ScriptureDocument): document is ScriptureDocument {
  return 'findNodes' in document;
}
