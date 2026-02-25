import { Diagnostic, DiagnosticSeverity, TextDocument } from '@sillsdev/lynx';
import { describe, expect, it } from 'vitest';

import { DiagnosticFactory } from '../src/diagnostic-factory';
import { StubFixedLineWidthTextDocument, StubSingleLineTextDocument } from './test-utils';

describe('DiagnosticFactory', () => {
  it('correctly builds Diagnostic objects', async () => {
    const diagnosticFactory: DiagnosticFactory = new DiagnosticFactory(
      'test-source-id',
      new StubSingleLineTextDocument('test'),
    );

    const code = 'testing-code';
    const message = 'testing-message';

    const diagnostic: Diagnostic = await diagnosticFactory
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

  it('adjusts the position of the error when an enclosing range is provided', async () => {
    const diagnosticFactory: DiagnosticFactory = new DiagnosticFactory(
      'test-source-id',
      new StubFixedLineWidthTextDocument('test'),
    );

    const code = 'testing-code';
    const message = 'testing-message';

    const diagnostic: Diagnostic = await diagnosticFactory
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

  it('produces errors when the Diagnostic object is incompletely specified', async () => {
    const diagnosticFactory: DiagnosticFactory = new DiagnosticFactory(
      'test-source-id',
      new TextDocument('test', 'no-format', 1, ''),
    );

    const code = 'testing-code';
    const message = 'testing-message';

    const diagnosticMissingCode: () => Promise<Diagnostic> = () => {
      return diagnosticFactory
        .newBuilder()
        .setMessage(message)
        .setRange(5, 10)
        .setSeverity(DiagnosticSeverity.Warning)
        .build();
    };
    await expect(diagnosticMissingCode()).rejects.toThrowError(/Diagnostic code was not initialized/);

    const diagnosticMissingMessage: () => Promise<Diagnostic> = () => {
      return diagnosticFactory
        .newBuilder()
        .setCode(code)
        .setRange(5, 10)
        .setSeverity(DiagnosticSeverity.Warning)
        .build();
    };
    await expect(diagnosticMissingMessage()).rejects.toThrowError(/Diagnostic message was not initialized/);

    const diagnosticMissingRange: () => Promise<Diagnostic> = () => {
      return diagnosticFactory
        .newBuilder()
        .setCode(code)
        .setMessage(message)
        .setSeverity(DiagnosticSeverity.Warning)
        .build();
    };
    await expect(diagnosticMissingRange()).rejects.toThrowError(/Diagnostic range was not initialized/);

    const diagnosticMissingSeverity: () => Promise<Diagnostic> = () => {
      return diagnosticFactory.newBuilder().setCode(code).setMessage(message).setRange(5, 10).build();
    };
    await expect(diagnosticMissingSeverity()).rejects.toThrowError(/Diagnostic severity was not initialized/);
  });

  it('computes fingerprint with no verse ref', async () => {
    const diagnosticFactory: DiagnosticFactory = new DiagnosticFactory(
      'test-source-id',
      new StubSingleLineTextDocument('test'),
    );

    const diagnostic: Diagnostic = await diagnosticFactory
      .newBuilder()
      .setCode('test-code')
      .setMessage('test message')
      .setRange(0, 4)
      .setSeverity(DiagnosticSeverity.Error)
      .setContent('test')
      .setLeftContext('left')
      .setRightContext('right')
      .build();

    expect(diagnostic.fingerprint).toContain('da934fb5');
  });

  it('computes fingerprint with verse ref', async () => {
    const diagnosticFactory: DiagnosticFactory = new DiagnosticFactory(
      'test-source-id',
      new StubSingleLineTextDocument('test'),
    );

    const diagnostic: Diagnostic = await diagnosticFactory
      .newBuilder()
      .setCode('test-code')
      .setMessage('test message')
      .setRange(0, 4)
      .setSeverity(DiagnosticSeverity.Error)
      .setContent('test')
      .setLeftContext('left')
      .setRightContext('right')
      .setVerseRef('1:1')
      .build();

    expect(diagnostic.fingerprint).toContain('e87a6b57');
  });

  it('computes fingerprint with different range', async () => {
    const diagnosticFactory: DiagnosticFactory = new DiagnosticFactory(
      'test-source-id',
      new StubSingleLineTextDocument('test'),
    );

    const diagnostic1: Diagnostic = await diagnosticFactory
      .newBuilder()
      .setCode('test-code')
      .setMessage('test message')
      .setRange(0, 4)
      .setSeverity(DiagnosticSeverity.Error)
      .setContent('test')
      .setLeftContext('left')
      .setRightContext('right')
      .setVerseRef('1:1')
      .build();

    const diagnostic2: Diagnostic = await diagnosticFactory
      .newBuilder()
      .setCode('test-code')
      .setMessage('test message')
      .setRange(1, 3)
      .setSeverity(DiagnosticSeverity.Error)
      .setContent('test')
      .setLeftContext('left')
      .setRightContext('right')
      .setVerseRef('1:1')
      .build();

    expect(diagnostic1.fingerprint).toEqual(diagnostic2.fingerprint);
  });

  it('computes fingerprint with different context', async () => {
    const diagnosticFactory: DiagnosticFactory = new DiagnosticFactory(
      'test-source-id',
      new StubSingleLineTextDocument('test'),
    );

    const diagnostic1: Diagnostic = await diagnosticFactory
      .newBuilder()
      .setCode('test-code')
      .setMessage('test message')
      .setRange(0, 4)
      .setSeverity(DiagnosticSeverity.Error)
      .setContent('test')
      .setLeftContext('left')
      .setRightContext('right')
      .setVerseRef('1:1')
      .build();

    const diagnostic2: Diagnostic = await diagnosticFactory
      .newBuilder()
      .setCode('test-code')
      .setMessage('test message')
      .setRange(0, 4)
      .setSeverity(DiagnosticSeverity.Error)
      .setContent('test')
      .setLeftContext(' new ')
      .setRightContext('right')
      .setVerseRef('1:1')
      .build();

    expect(diagnostic1.fingerprint).not.toEqual(diagnostic2.fingerprint);
  });
});
