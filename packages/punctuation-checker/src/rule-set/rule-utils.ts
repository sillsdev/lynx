export interface PairedPunctuationRule {
  openingPunctuationMark: string;
  closingPunctuationMark: string;
}

export class AmbiguousPunctuationMap {
  private readonly punctuationMap: Map<string, Set<string>> = new Map<string, Set<string>>();

  public mapAmbiguousPunctuation(ambigiousMark: string, unambiguousMark: string): void {
    if (!this.punctuationMap.has(ambigiousMark)) {
      this.punctuationMap.set(ambigiousMark, new Set<string>());
    }
    this.punctuationMap.get(ambigiousMark)?.add(unambiguousMark);
  }

  public lookUpAmbiguousMark(ambigiousMark: string): string[] {
    if (this.punctuationMap.has(ambigiousMark)) {
      return Array.from(this.punctuationMap.get(ambigiousMark)?.values() ?? []);
    }
    return [];
  }

  public getAmbiguousMarks(): string[] {
    return Array.from(this.punctuationMap.keys());
  }
}
