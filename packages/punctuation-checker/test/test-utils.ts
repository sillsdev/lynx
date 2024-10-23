import { TextDocument, Range, Position } from 'vscode-languageserver-textdocument';

export class MockSingleLineTextDocument implements TextDocument {
  public uri: string = 'test-uri';
  public languageId:string = 'test-language';
  public version: number = 12345;
  public lineCount: number = 1;
  
  public constructor(private readonly text: string) {
  
  }
    
  public getText(range?: Range): string {
    return this.text;
  }
  
  public positionAt(offset: number): Position {
    return {
      line: 0,
      character: offset
    }
  }
  
  public offsetAt(position: Position): number {
    return position.character;
  }
}