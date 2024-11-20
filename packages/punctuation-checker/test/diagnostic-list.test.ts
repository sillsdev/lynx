import { DiagnosticSeverity, TextDocument } from '@sillsdev/lynx';
import { expect, it } from 'vitest';

import { DiagnosticFactory } from '../src/diagnostic-factory';
import { DiagnosticList } from '../src/diagnostic-list';

const diagnosticFactory: DiagnosticFactory = new DiagnosticFactory('test-source', new TextDocument('test', 1, ''));
const sampleDiagnostic1 = diagnosticFactory
  .newBuilder()
  .setCode(1234)
  .setMessage('diagnostic1')
  .setRange(5, 6)
  .setSeverity(DiagnosticSeverity.Hint)
  .build();
const sampleDiagnostic2 = diagnosticFactory
  .newBuilder()
  .setCode(5678)
  .setMessage('diagnostic2')
  .setRange(9, 10)
  .setSeverity(DiagnosticSeverity.Error)
  .build();

it('returns diagnostics in the order added', () => {
  const diagnosticList: DiagnosticList = new DiagnosticList();

  diagnosticList.addDiagnostic(sampleDiagnostic1);
  diagnosticList.addDiagnostic(sampleDiagnostic2);
  const expectedOutput = [sampleDiagnostic1, sampleDiagnostic2];
  expect(diagnosticList.toArray()).toEqual(expectedOutput);
});

it('preserves identical items', () => {
  const diagnosticList: DiagnosticList = new DiagnosticList();

  diagnosticList.addDiagnostic(sampleDiagnostic1);
  diagnosticList.addDiagnostic(sampleDiagnostic1);
  diagnosticList.addDiagnostic(sampleDiagnostic2);
  const expectedOutput = [sampleDiagnostic1, sampleDiagnostic1, sampleDiagnostic2];
  expect(diagnosticList.toArray()).toEqual(expectedOutput);
});
