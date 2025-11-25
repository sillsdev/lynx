import { Range, ScriptureNode, ScriptureNodeType } from '@sillsdev/lynx';

export abstract class Checkable {
  private previousNeighbor: Checkable | undefined = undefined;
  private nextNeighbor: Checkable | undefined = undefined;

  public abstract getText(): string;
  public abstract getEnclosingRange(): Range | undefined;
  public abstract isLeadingWhitespacePossiblyTruncated(): boolean;
  public abstract isTrailingWhitespacePossiblyTruncated(): boolean;
  public abstract hasParagraphStart(): boolean;
  public abstract getTextSinceLastParagraphStart(endingIndex: number): string | undefined;

  public previous(): Checkable | undefined {
    return this.previousNeighbor;
  }
  public next(): Checkable | undefined {
    return this.nextNeighbor;
  }

  setPrevious(previous: Checkable): void {
    this.previousNeighbor = previous;
  }
  setNext(next: Checkable): void {
    this.nextNeighbor = next;
  }
}

export class TextDocumentCheckable extends Checkable {
  constructor(private readonly text: string) {
    super();
  }

  public getText(): string {
    return this.text;
  }
  public getEnclosingRange(): Range | undefined {
    return undefined;
  }
  public isLeadingWhitespacePossiblyTruncated(): boolean {
    return false;
  }
  public isTrailingWhitespacePossiblyTruncated(): boolean {
    return false;
  }

  public hasParagraphStart(): boolean {
    return true;
  }

  public getTextSinceLastParagraphStart(endingIndex: number): string | undefined {
    const textUpToEndingIndex = this.text.slice(0, Math.min(Math.max(endingIndex, 0), this.text.length));
    const lastParagraphBreakIndex = textUpToEndingIndex.lastIndexOf('\n');
    return textUpToEndingIndex.slice(lastParagraphBreakIndex + 1);
  }
}

export class ScriptureNodeCheckable extends Checkable {
  constructor(private readonly scriptureNode: ScriptureNode) {
    super();
  }

  public getText(): string {
    return this.scriptureNode.getText();
  }
  public getEnclosingRange(): Range | undefined {
    return this.scriptureNode.range;
  }
  public isLeadingWhitespacePossiblyTruncated(): boolean {
    return this.isNodePrecededByParagraphVerseOrChapterMarker(this.scriptureNode);
  }
  public isTrailingWhitespacePossiblyTruncated(): boolean {
    return this.isNodeFollowedByParagraphVerseOrChapterMarker(this.scriptureNode);
  }

  public hasParagraphStart(): boolean {
    return this.doesNodeHaveParagraphMarkerAncestorWithNoInterveningText(this.scriptureNode);
  }

  public getTextSinceLastParagraphStart(endingIndex: number): string | undefined {
    if (!this.hasParagraphStart()) {
      return undefined;
    }
    return this.scriptureNode.getText().slice(0, Math.min(endingIndex, this.scriptureNode.getText().length));
  }

  private doesNodeHaveParagraphMarkerAncestorWithNoInterveningText(node: ScriptureNode): boolean {
    if (node.parent !== undefined) {
      if (node.parent.type === ScriptureNodeType.Paragraph) {
        return !this.doesNodeHaveAnyLeftSiblingTextNodes(node);
      }
      return this.doesNodeHaveParagraphMarkerAncestorWithNoInterveningText(node.parent);
    }
    return false;
  }

  private doesNodeHaveAnyLeftSiblingTextNodes(node: ScriptureNode): boolean {
    if (node.previous !== undefined) {
      if (node.previous.type === ScriptureNodeType.Text || this.doesNodeHaveAnyDescendantTextNodes(node.previous)) {
        return true;
      }
      return this.doesNodeHaveAnyLeftSiblingTextNodes(node.previous);
    }
    return false;
  }

  private doesNodeHaveAnyDescendantTextNodes(node: ScriptureNode): boolean {
    if (node.type === ScriptureNodeType.Note || node.type === ScriptureNodeType.Ref) {
      return false;
    }
    for (const child of node.children) {
      if (child.type === ScriptureNodeType.Text) {
        return true;
      }
      return this.doesNodeHaveAnyDescendantTextNodes(child);
    }
    return false;
  }

  private isNodePrecededByParagraphVerseOrChapterMarker(node: ScriptureNode): boolean {
    if (node.previous !== undefined) {
      if (
        node.previous.type === ScriptureNodeType.Paragraph ||
        node.previous.type === ScriptureNodeType.Verse ||
        node.previous.type === ScriptureNodeType.Chapter
      ) {
        return true;
      }
      return false;
    }
    if (node.parent !== undefined) {
      if (node.parent.type === ScriptureNodeType.Paragraph) {
        return true;
      }
      return this.isNodePrecededByParagraphVerseOrChapterMarker(node.parent);
    }
    return false;
  }

  private isNodeFollowedByParagraphVerseOrChapterMarker(node: ScriptureNode): boolean {
    if (node.next !== undefined) {
      if (
        node.next.type === ScriptureNodeType.Paragraph ||
        node.next.type === ScriptureNodeType.Verse ||
        node.next.type === ScriptureNodeType.Chapter
      ) {
        return true;
      }
      return false;
    }
    if (node.parent !== undefined) {
      return this.isNodeFollowedByParagraphVerseOrChapterMarker(node.parent);
    }
    return false;
  }
}

export class CheckableGroup implements IterableIterator<Checkable> {
  private currentIndex = 0;

  constructor(private readonly checkables: Checkable[]) {
    this.setCheckableNeighbors();
  }

  private setCheckableNeighbors(): void {
    for (let index = 0; index < this.checkables.length; ++index) {
      if (index > 0) {
        this.checkables[index].setPrevious(this.checkables[index - 1]);
      }
      if (index < this.checkables.length - 1) {
        this.checkables[index].setNext(this.checkables[index + 1]);
      }
    }
  }

  public size(): number {
    return this.checkables.length;
  }

  [Symbol.iterator](): this {
    return this;
  }

  next(): IteratorResult<Checkable> {
    if (this.currentIndex < this.checkables.length) {
      return {
        done: false,
        value: this.checkables[this.currentIndex++],
      };
    }
    return {
      done: true,
      value: undefined,
    };
  }
}
