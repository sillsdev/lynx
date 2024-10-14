import {
  Diagnostic,
  DiagnosticSeverity,
  Range
} from "lynx-core";
import { TextDocument } from 'vscode-languageserver-textdocument';

export class DiagnosticFactory {
  constructor(private readonly sourceId: string,
              private readonly textDocument: TextDocument) {
  
  }
  
  public newBuilder(): DiagnosticBuilder {
    return new DiagnosticBuilder(this.sourceId, this.textDocument);
  }
}
  
class DiagnosticBuilder {
  
  private code: string | number | undefined;
  private severity: DiagnosticSeverity | undefined;
  private range: Range | undefined;
  private message: string | undefined;
  
  constructor(private readonly sourceId: string,
              private readonly textDocument: TextDocument) {
  
  }
  
  public setCode(code: string | number): DiagnosticBuilder {
    this.code = code;
    return this;
  }
  
  public setSeverity(severity: DiagnosticSeverity): DiagnosticBuilder {
    this.severity = severity;
    return this;
  }
  
  public setRange(startIndex: number, endIndex: number): DiagnosticBuilder {
    this.range = {
      start: this.textDocument.positionAt(startIndex),
      end: this.textDocument.positionAt(endIndex),
    };
    return this;
  }
  
  public setMessage(message: string) : DiagnosticBuilder {
    this.message = message;
    return this;
  }
  
  public build(): Diagnostic {
    if(this.code === undefined) {
      throw new Error("Diagnostic code was not initialized");
    }
    if(this.severity === undefined) {
      throw new Error("Diagnostic severity was not initialized");
    }
    if(this.range === undefined) {
      throw new Error("Diagnostic range was not initialized");
    }
    if(this.message === undefined) {
      throw new Error("Diagnostic message was not initialized");
    }
  
    return {
      code: this.code,
      source: this.sourceId,
      severity: this.severity,
      range: this.range,
      message: this.message
    }
  }
}