import { Range, ScriptureNode, ScriptureNodeType } from '@sillsdev/lynx';

export abstract class Checkable {
  private previousNeighbor: Checkable | undefined = undefined;
  private nextNeighbor: Checkable | undefined = undefined;

  public abstract getText(): string;
  public abstract getEnclosingRange(): Range | undefined;
  public abstract isLeadingWhitespacePossiblyTruncated(): boolean;
  public abstract isTrailingWhitespacePossiblyTruncated(): boolean;

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
    return this.isNodePrecededByParagraphMarker(this.scriptureNode);
  }
  public isTrailingWhitespacePossiblyTruncated(): boolean {
    return this.isNodeFollowedByParagraphMarker(this.scriptureNode);
  }

  private isNodePrecededByParagraphMarker(node: ScriptureNode): boolean {
    if (node.previous !== undefined) {
      if (node.previous.type === ScriptureNodeType.Paragraph) {
        return true;
      }
      return false;
    }
    if (node.parent !== undefined) {
      if (node.parent.type === ScriptureNodeType.Paragraph) {
        return true;
      }
      return this.isNodePrecededByParagraphMarker(node.parent);
    }
    return false;
  }

  private isNodeFollowedByParagraphMarker(node: ScriptureNode): boolean {
    if (node.next !== undefined) {
      if (node.next.type === ScriptureNodeType.Paragraph) {
        return true;
      }
      return false;
    }
    if (node.parent !== undefined) {
      return this.isNodeFollowedByParagraphMarker(node.parent);
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
