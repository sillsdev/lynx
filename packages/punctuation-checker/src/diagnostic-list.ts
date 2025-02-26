import { Diagnostic } from '@sillsdev/lynx';

export class DiagnosticList {
  private readonly diagnostics: Diagnostic[] = [];

  public addDiagnostic(diagnostic: Diagnostic): void {
    this.diagnostics.push(diagnostic);
  }

  public toArray(): Diagnostic[] {
    return this.diagnostics;
  }
}
