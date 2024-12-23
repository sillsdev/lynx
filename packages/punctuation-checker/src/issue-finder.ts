import { Diagnostic, ScriptureNode } from '@sillsdev/lynx';

import { DiagnosticFactory } from './diagnostic-factory';

export interface IssueFinder {
  produceDiagnostics(text: string): Diagnostic[];

  produceDiagnosticsForScripture(nodes: ScriptureNode | ScriptureNode[]): Diagnostic[];
}

export interface IssueFinderFactory {
  createIssueFinder(diagnosticFactory: DiagnosticFactory): IssueFinder;
}
