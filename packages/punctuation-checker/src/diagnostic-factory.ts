import { Diagnostic, DiagnosticSeverity, Range, ScriptureDocument, TextDocument } from '@sillsdev/lynx';

export class DiagnosticFactory {
  constructor(
    private readonly sourceId: string,
    private readonly document: TextDocument | ScriptureDocument,
  ) {}

  public newBuilder(): DiagnosticBuilder {
    return new DiagnosticBuilder(this.sourceId, this.document);
  }
}

class DiagnosticBuilder {
  private code: string | number | undefined;
  private severity: DiagnosticSeverity | undefined;
  private range: Range | undefined;
  private message: string | undefined;
  private data: unknown = '';

  constructor(
    private readonly sourceId: string,
    private readonly document: TextDocument | ScriptureDocument,
  ) {}

  public setCode(code: string | number): this {
    this.code = code;
    return this;
  }

  public setSeverity(severity: DiagnosticSeverity): this {
    this.severity = severity;
    return this;
  }

  public setRange(startIndex: number, endIndex: number, enclosingRange?: Range): this {
    if (enclosingRange === undefined) {
      this.range = {
        start: this.document.positionAt(startIndex),
        end: this.document.positionAt(endIndex),
      };
    } else {
      this.range = {
        start: this.document.positionAt(startIndex, enclosingRange),
        end: this.document.positionAt(endIndex, enclosingRange),
      };
    }
    return this;
  }

  public setMessage(message: string): this {
    this.message = message;
    return this;
  }

  public setData(data: unknown): this {
    this.data = data;
    return this;
  }

  public build(): Diagnostic {
    if (this.code === undefined) {
      throw new Error('Diagnostic code was not initialized');
    }
    if (this.severity === undefined) {
      throw new Error('Diagnostic severity was not initialized');
    }
    if (this.range === undefined) {
      throw new Error('Diagnostic range was not initialized');
    }
    if (this.message === undefined) {
      throw new Error('Diagnostic message was not initialized');
    }

    return {
      code: this.code,
      source: this.sourceId,
      severity: this.severity,
      range: this.range,
      message: this.message,
      data: this.data,
    };
  }
}
