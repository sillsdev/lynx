import { Range } from '../common/range';

export enum DiagnosticSeverity {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4,
}

export interface Diagnostic {
  code: string | number;
  source: string;
  range: Range;
  severity: DiagnosticSeverity;
  message: string;
  moreInfo?: string;
  data?: unknown;
  fingerprint?: string;
}
