import { Diagnostic, ScriptureNode } from '@sillsdev/lynx';

import { DiagnosticFactory } from './diagnostic-factory';
import { ScriptureNodeGroup } from './utils';

export interface IssueFinder {
  produceDiagnostics(text: string): Diagnostic[];

  produceDiagnosticsForScripture(nodes: ScriptureNode | ScriptureNodeGroup): Diagnostic[];
}

export interface IssueFinderFactory {
  createIssueFinder(diagnosticFactory: DiagnosticFactory): IssueFinder;
}
