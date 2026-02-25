import { Diagnostic, DiagnosticSeverity, TextDocument } from '@sillsdev/lynx';
import { expect, it } from 'vitest';

import { DiagnosticFactory } from '../src/diagnostic-factory';
import { DiagnosticList } from '../src/diagnostic-list';

it('returns diagnostics in the order added', async () => {
  const env = new TestEnvironment();
  const sampleDiagnostic1: Diagnostic = await env.createDiagnostic1();
  const sampleDiagnostic2: Diagnostic = await env.createDiagnostic2();
  const diagnosticList: DiagnosticList = new DiagnosticList();

  diagnosticList.addDiagnostic(sampleDiagnostic1);
  diagnosticList.addDiagnostic(sampleDiagnostic2);
  const expectedOutput = [sampleDiagnostic1, sampleDiagnostic2];
  expect(diagnosticList.toArray()).toEqual(expectedOutput);
});

it('preserves identical items', async () => {
  const env = new TestEnvironment();
  const sampleDiagnostic1: Diagnostic = await env.createDiagnostic1();
  const sampleDiagnostic2: Diagnostic = await env.createDiagnostic2();
  const diagnosticList: DiagnosticList = new DiagnosticList();

  diagnosticList.addDiagnostic(sampleDiagnostic1);
  diagnosticList.addDiagnostic(sampleDiagnostic1);
  diagnosticList.addDiagnostic(sampleDiagnostic2);
  const expectedOutput = [sampleDiagnostic1, sampleDiagnostic1, sampleDiagnostic2];
  expect(diagnosticList.toArray()).toEqual(expectedOutput);
});

class TestEnvironment {
  private readonly diagnosticFactory: DiagnosticFactory;

  constructor() {
    this.diagnosticFactory = new DiagnosticFactory('test-source', new TextDocument('test', 'no-format', 1, ''));
  }

  createDiagnostic1(): Promise<Diagnostic> {
    return this.diagnosticFactory
      .newBuilder()
      .setCode(1234)
      .setMessage('diagnostic1')
      .setRange(5, 6)
      .setSeverity(DiagnosticSeverity.Hint)
      .build();
  }

  createDiagnostic2(): Promise<Diagnostic> {
    return this.diagnosticFactory
      .newBuilder()
      .setCode(5678)
      .setMessage('diagnostic2')
      .setRange(9, 10)
      .setSeverity(DiagnosticSeverity.Error)
      .build();
  }
}
