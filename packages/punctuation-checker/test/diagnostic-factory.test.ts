import { Diagnostic, DiagnosticSeverity, TextDocument } from '@sillsdev/lynx';
import { expect, it } from 'vitest';

import { DiagnosticFactory } from '../src/diagnostic-factory';
import { StubFixedLineWidthTextDocument, StubSingleLineTextDocument } from './test-utils';

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
    .setData({ a: 15, b: 'test' })
    .build();

  expect(diagnostic.code).toEqual(code);
  expect(diagnostic.message).toEqual(message);
  expect(diagnostic.range.start.line).toEqual(0);
  expect(diagnostic.range.start.character).toEqual(5);
  expect(diagnostic.range.end.line).toEqual(0);
  expect(diagnostic.range.end.character).toEqual(10);
  expect(diagnostic.severity).toEqual(DiagnosticSeverity.Warning);
  expect(diagnostic.data).toEqual({ a: 15, b: 'test' });
});

it('adjusts the position of the error when an enclosing range is provided', () => {
  const diagnosticFactory: DiagnosticFactory = new DiagnosticFactory(
    'test-source-id',
    new StubFixedLineWidthTextDocument('test'),
  );

  const code = 'testing-code';
  const message = 'testing-message';

  const diagnostic: Diagnostic = diagnosticFactory
    .newBuilder()
    .setCode(code)
    .setMessage(message)
    .setRange(5, 10, {
      start: {
        line: 3,
        character: 8,
      },
      end: {
        line: 4,
        character: 29,
      },
    })
    .setSeverity(DiagnosticSeverity.Warning)
    .setData({ a: 15, b: 'test' })
    .build();

  expect(diagnostic.code).toEqual(code);
  expect(diagnostic.message).toEqual(message);
  expect(diagnostic.range.start.line).toEqual(3);
  expect(diagnostic.range.start.character).toEqual(13);
  expect(diagnostic.range.end.line).toEqual(3);
  expect(diagnostic.range.end.character).toEqual(18);
  expect(diagnostic.severity).toEqual(DiagnosticSeverity.Warning);
  expect(diagnostic.data).toEqual({ a: 15, b: 'test' });
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
