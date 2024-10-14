import { Diagnostic } from "lynx-core";
import { BasicCheckerConfig } from "./abstract-checker";

export class DiagnosticList {
  private readonly diagnostics: Diagnostic[] = [];

  constructor(private readonly settings: BasicCheckerConfig) {
    
  }

  public isProblemThresholdReached(): boolean {
    return this.diagnostics.length >= this.settings.maxNumberOfProblems;
  }

  public addDiagnostic(diagnostic: Diagnostic): void {
    this.diagnostics.push(diagnostic);
  }

  public toArray(): Diagnostic[] {
    return this.diagnostics;
  }
}
