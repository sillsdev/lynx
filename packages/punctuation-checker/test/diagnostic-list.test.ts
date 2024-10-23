import { expect, test, it } from 'vitest'
import { MockSingleLineTextDocument } from "./test-utils";
import { DiagnosticList } from '../src/diagnostic-list';
import { DiagnosticFactory } from '../src/diagnostic-factory';
import { Position, Range, TextDocument } from 'vscode-languageserver-textdocument';
import { DiagnosticSeverity } from 'lynx-core';

const defaultDiagnosticSettings = {
  maxNumberOfProblems: 100
};

const diagnosticFactory: DiagnosticFactory = new DiagnosticFactory('test-source', new MockSingleLineTextDocument(""));
const sampleDiagnostic1 = diagnosticFactory.newBuilder()
  .setCode(1234)
  .setMessage('diagnostic1')
  .setRange(5, 6)
  .setSeverity(DiagnosticSeverity.Hint)
  .build();
const sampleDiagnostic2 = diagnosticFactory.newBuilder()
  .setCode(5678)
  .setMessage('diagnostic2')
  .setRange(9, 10)
  .setSeverity(DiagnosticSeverity.Error)
  .build();

it('returns diagnostics in the order added', () => {
  const diagnosticList: DiagnosticList = new DiagnosticList(defaultDiagnosticSettings);

  diagnosticList.addDiagnostic(sampleDiagnostic1);
  diagnosticList.addDiagnostic(sampleDiagnostic2);
  const expectedOutput = [sampleDiagnostic1, sampleDiagnostic2];
  expect(diagnosticList.toArray()).toEqual(expectedOutput);
});

it('preserves identical items', () => {
  const diagnosticList: DiagnosticList = new DiagnosticList(defaultDiagnosticSettings);

  diagnosticList.addDiagnostic(sampleDiagnostic1);
  diagnosticList.addDiagnostic(sampleDiagnostic1);
  diagnosticList.addDiagnostic(sampleDiagnostic2);
  const expectedOutput = [sampleDiagnostic1, sampleDiagnostic1, sampleDiagnostic2];
  expect(diagnosticList.toArray()).toEqual(expectedOutput);
})

it('compares its own size against the number of problems allowed', () => {
  const customDiagnosticSettings = {
    maxNumberOfProblems: 2
  };

  const diagnosticList: DiagnosticList = new DiagnosticList(customDiagnosticSettings);
  diagnosticList.addDiagnostic(sampleDiagnostic1);
  expect(diagnosticList.isProblemThresholdReached()).toBe(false);

  diagnosticList.addDiagnostic(sampleDiagnostic2);
  expect(diagnosticList.isProblemThresholdReached()).toBe(true);

  diagnosticList.addDiagnostic(sampleDiagnostic2);
  expect(diagnosticList.isProblemThresholdReached()).toBe(true);
})