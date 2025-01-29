import { Diagnostic } from '@sillsdev/lynx';

import { CheckableGroup } from './checkable';
import { DiagnosticFactory } from './diagnostic-factory';

export interface IssueFinder {
  produceDiagnostics(checkableGroup: CheckableGroup): Diagnostic[];
}

export interface IssueFinderFactory {
  createIssueFinder(diagnosticFactory: DiagnosticFactory): IssueFinder;
}
