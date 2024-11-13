import { expect, it } from 'vitest';

import { DiagnosticFactory } from '../src/diagnostic-factory';
import { Diagnostic, DiagnosticSeverity, TextDocument } from '@sillsdev/lynx';
import { StubSingleLineTextDocument } from './test-utils';

it('correctly builds Diagnostic objects', () => {
  const diagnosticFactory: DiagnosticFactory = new DiagnosticFactory(
    'test-source-id',
    new StubSingleLineTextDocument('test'),
  );

  const code = 'testing-code';
  const message = 'testing-message';

  const diagnostic: Diagnostic = diagnosticFactory
    .newBuilder()
    .setCode(code)
    .setMessage(message)
    .setRange(5, 10)
    .setSeverity(DiagnosticSeverity.Warning)
    .build();

  expect(diagnostic.code).toEqual(code);
  expect(diagnostic.message).toEqual(message);
  expect(diagnostic.range.start.line).toEqual(0);
  expect(diagnostic.range.start.character).toEqual(5);
  expect(diagnostic.range.end.line).toEqual(0);
  expect(diagnostic.range.end.character).toEqual(10);
  expect(diagnostic.severity).toEqual(DiagnosticSeverity.Warning);
});

it('produces errors when the Diagnostic object is incompletely specified', () => {
  const diagnosticFactory: DiagnosticFactory = new DiagnosticFactory('test-source-id', new TextDocument('test', 1, ''));

  const code = 'testing-code';
  const message = 'testing-message';

  const diagnosticMissingCode: () => Diagnostic = () => {
    return diagnosticFactory
      .newBuilder()
      .setMessage(message)
      .setRange(5, 10)
      .setSeverity(DiagnosticSeverity.Warning)
      .build();
  };
  expect(diagnosticMissingCode).toThrowError(/Diagnostic code was not initialized/);

  const diagnosticMissingMessage: () => Diagnostic = () => {
    return diagnosticFactory.newBuilder().setCode(code).setRange(5, 10).setSeverity(DiagnosticSeverity.Warning).build();
  };
  expect(diagnosticMissingMessage).toThrowError(/Diagnostic message was not initialized/);

  const diagnosticMissingRange: () => Diagnostic = () => {
    return diagnosticFactory
      .newBuilder()
      .setCode(code)
      .setMessage(message)
      .setSeverity(DiagnosticSeverity.Warning)
      .build();
  };
  expect(diagnosticMissingRange).toThrowError(/Diagnostic range was not initialized/);

  const diagnosticMissingSeverity: () => Diagnostic = () => {
    return diagnosticFactory.newBuilder().setCode(code).setMessage(message).setRange(5, 10).build();
  };
  expect(diagnosticMissingSeverity).toThrowError(/Diagnostic severity was not initialized/);
});
