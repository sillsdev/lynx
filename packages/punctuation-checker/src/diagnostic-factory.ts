import { Sha256 } from '@aws-crypto/sha256-universal';
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
  private verseRef: string | undefined = undefined;
  private content: string | undefined = undefined;
  private leftContext: string | undefined = undefined;
  private rightContext: string | undefined = undefined;

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

  public setVerseRef(verseRef: string | undefined): this {
    this.verseRef = verseRef;
    return this;
  }

  public setContent(content: string | undefined): this {
    this.content = content;
    return this;
  }

  public setLeftContext(leftContext: string | undefined): this {
    this.leftContext = leftContext;
    return this;
  }

  public setRightContext(rightContext: string | undefined): this {
    this.rightContext = rightContext;
    return this;
  }

  public async build(): Promise<Diagnostic> {
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

    const hash = new Sha256();
    hash.update(this.code.toString());
    if (this.verseRef != null) {
      hash.update('|' + this.verseRef);
    }
    if (this.content != null) {
      hash.update('|' + this.content);
    }
    if (this.leftContext != null) {
      hash.update('|' + this.leftContext);
    }
    if (this.rightContext != null) {
      hash.update('|' + this.rightContext);
    }
    const fingerprint = toHexString((await hash.digest()).subarray(0, 16));

    return {
      code: this.code,
      source: this.sourceId,
      severity: this.severity,
      range: this.range,
      message: this.message,
      data: this.data,
      fingerprint: fingerprint,
    };
  }
}

function toHexString(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
