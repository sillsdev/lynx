import { firstValueFrom, lastValueFrom, skip, Subject, take, toArray } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { mock, MockProxy } from 'vitest-mock-extended';

import { Diagnostic, DiagnosticSeverity } from '../diagnostic/diagnostic';
import { DiagnosticProvider, DiagnosticsChanged } from '../diagnostic/diagnostic-provider';
import { Localizer } from './localizer';
import { Workspace } from './workspace';

describe('Workspace', () => {
  describe('diagnosticsChanged$', () => {
    it('emits diagnostics from single provider', async () => {
      const env = new TestEnvironment();
      const diagnostics: Diagnostic[] = [
        {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
          severity: DiagnosticSeverity.Warning,
          code: 1,
          source: 'provider1',
          message: 'Test diagnostic',
        },
      ];

      const changedPromise = firstValueFrom(env.workspace.diagnosticsChanged$);
      env.provider1Subject.next({ uri: 'file1', version: 1, diagnostics });
      const changed = await changedPromise;

      expect(changed.uri).toEqual('file1');
      expect(changed.version).toEqual(1);
      expect(changed.diagnostics).toHaveLength(1);
      expect(changed.diagnostics[0].message).toEqual('Test diagnostic');
    });

    it('combines diagnostics from multiple providers', async () => {
      const env = new TestEnvironment();
      const diagnostics1: Diagnostic[] = [
        {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
          severity: DiagnosticSeverity.Warning,
          code: 1,
          source: 'provider1',
          message: 'Diagnostic from provider 1',
        },
      ];
      const diagnostics2: Diagnostic[] = [
        {
          range: { start: { line: 1, character: 0 }, end: { line: 1, character: 3 } },
          severity: DiagnosticSeverity.Error,
          code: 2,
          source: 'provider2',
          message: 'Diagnostic from provider 2',
        },
      ];

      const changedPromise = firstValueFrom(env.workspace.diagnosticsChanged$.pipe(skip(1)));
      // Emit from provider1 first to establish its state
      env.provider1Subject.next({ uri: 'file1', version: 1, diagnostics: diagnostics1 });
      // Now emit from provider2 which will trigger the combined emission
      env.provider2Subject.next({ uri: 'file1', version: 1, diagnostics: diagnostics2 });
      const changed = await changedPromise;

      expect(changed.uri).toEqual('file1');
      expect(changed.version).toEqual(1);
      expect(changed.diagnostics).toHaveLength(2);
      expect(changed.diagnostics.find((d) => d.source === 'provider1')).toBeDefined();
      expect(changed.diagnostics.find((d) => d.source === 'provider2')).toBeDefined();
    });

    it('filters out dismissed diagnostics', async () => {
      const env = new TestEnvironment();
      const diagnostics: Diagnostic[] = [
        {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
          severity: DiagnosticSeverity.Warning,
          code: 1,
          source: 'provider1',
          message: 'Diagnostic 1',
          fingerprint: 'fingerprint1',
        },
        {
          range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } },
          severity: DiagnosticSeverity.Warning,
          code: 2,
          source: 'provider1',
          message: 'Diagnostic 2',
          fingerprint: 'fingerprint2',
        },
      ];

      // Emit initial diagnostics
      env.provider1Subject.next({ uri: 'file1', version: 1, diagnostics });

      // Dismiss the first diagnostic
      env.workspace.dismissDiagnostic('file1', diagnostics[0]);
      expect(env.provider1.refresh).toHaveBeenCalledWith('file1');

      // Wait for the refresh to emit filtered diagnostics
      const changedPromise = firstValueFrom(env.workspace.diagnosticsChanged$);
      env.provider1Subject.next({ uri: 'file1', version: 2, diagnostics });
      const changed = await changedPromise;

      expect(changed.uri).toEqual('file1');
      expect(changed.diagnostics).toHaveLength(1);
      expect(changed.diagnostics[0].message).toEqual('Diagnostic 2');
      expect(changed.diagnostics[0].fingerprint).toEqual('fingerprint2');
    });

    it('emits separate events for different URIs', async () => {
      const env = new TestEnvironment();
      const diagnostics1: Diagnostic[] = [
        {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
          severity: DiagnosticSeverity.Warning,
          code: 1,
          source: 'provider1',
          message: 'Diagnostic for file1',
        },
      ];
      const diagnostics2: Diagnostic[] = [
        {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
          severity: DiagnosticSeverity.Error,
          code: 2,
          source: 'provider1',
          message: 'Diagnostic for file2',
        },
      ];

      const changedPromise = lastValueFrom(env.workspace.diagnosticsChanged$.pipe(take(2), toArray()));
      env.provider1Subject.next({ uri: 'file1', version: 1, diagnostics: diagnostics1 });
      env.provider1Subject.next({ uri: 'file2', version: 1, diagnostics: diagnostics2 });
      const changed = await changedPromise;

      expect(changed).toHaveLength(2);
      expect(changed[0].uri).toEqual('file1');
      expect(changed[0].diagnostics[0].message).toEqual('Diagnostic for file1');
      expect(changed[1].uri).toEqual('file2');
      expect(changed[1].diagnostics[0].message).toEqual('Diagnostic for file2');
    });

    it('filters diagnostics by version', async () => {
      const env = new TestEnvironment();
      const diagnostics: Diagnostic[] = [
        {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
          severity: DiagnosticSeverity.Warning,
          code: 1,
          source: 'provider1',
          message: 'Diagnostic',
        },
      ];

      // Emit diagnostics for version 1
      env.provider1Subject.next({ uri: 'file1', version: 1, diagnostics });

      // Emit diagnostics for version 2 from the same provider
      const changedPromise = firstValueFrom(env.workspace.diagnosticsChanged$);
      env.provider1Subject.next({ uri: 'file1', version: 2, diagnostics });
      const changed = await changedPromise;

      expect(changed.uri).toEqual('file1');
      expect(changed.version).toEqual(2);
      expect(changed.diagnostics).toHaveLength(1);
    });

    it('combines diagnostics from same URI with matching versions', async () => {
      const env = new TestEnvironment();
      const diagnostics1: Diagnostic[] = [
        {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
          severity: DiagnosticSeverity.Warning,
          code: 1,
          source: 'provider1',
          message: 'Provider 1 diagnostic',
        },
      ];
      const diagnostics2: Diagnostic[] = [
        {
          range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } },
          severity: DiagnosticSeverity.Error,
          code: 2,
          source: 'provider2',
          message: 'Provider 2 diagnostic',
        },
      ];

      const changedPromise = firstValueFrom(env.workspace.diagnosticsChanged$.pipe(skip(1)));
      // Emit from provider1 first
      env.provider1Subject.next({ uri: 'file1', version: 1, diagnostics: diagnostics1 });
      // Then emit from provider2 with same version
      env.provider2Subject.next({ uri: 'file1', version: 1, diagnostics: diagnostics2 });
      const changed = await changedPromise;

      expect(changed.uri).toEqual('file1');
      expect(changed.version).toEqual(1);
      expect(changed.diagnostics).toHaveLength(2);
    });

    it('does not include diagnostics from mismatched versions', async () => {
      const env = new TestEnvironment();
      const diagnostics1: Diagnostic[] = [
        {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
          severity: DiagnosticSeverity.Warning,
          code: 1,
          source: 'provider1',
          message: 'Provider 1 diagnostic',
        },
      ];
      const diagnostics2: Diagnostic[] = [
        {
          range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } },
          severity: DiagnosticSeverity.Error,
          code: 2,
          source: 'provider2',
          message: 'Provider 2 diagnostic',
        },
      ];

      // Emit from provider1 with version 1
      env.provider1Subject.next({ uri: 'file1', version: 1, diagnostics: diagnostics1 });

      // Then emit from provider2 with version 2
      const changedPromise = firstValueFrom(env.workspace.diagnosticsChanged$);
      env.provider2Subject.next({ uri: 'file1', version: 2, diagnostics: diagnostics2 });
      const changed = await changedPromise;

      expect(changed.uri).toEqual('file1');
      expect(changed.version).toEqual(2);
      // Only provider2's diagnostics should be included since provider1's version doesn't match
      expect(changed.diagnostics).toHaveLength(1);
      expect(changed.diagnostics[0].source).toEqual('provider2');
    });

    it('handles refresh being called on provider', () => {
      const env = new TestEnvironment();
      const diagnostics: Diagnostic[] = [
        {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
          severity: DiagnosticSeverity.Warning,
          code: 1,
          source: 'provider1',
          message: 'Test diagnostic',
          fingerprint: 'fp1',
        },
      ];

      // Emit initial diagnostics
      env.provider1Subject.next({ uri: 'file1', version: 1, diagnostics });

      // Dismiss the diagnostic
      const result = env.workspace.dismissDiagnostic('file1', diagnostics[0]);

      expect(result).toBe(true);
      expect(env.provider1.refresh).toHaveBeenCalledWith('file1');
      expect(env.provider1.refresh).toHaveBeenCalledTimes(1);
    });

    it('does not dismiss diagnostic without fingerprint', () => {
      const env = new TestEnvironment();
      const diagnostic: Diagnostic = {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
        severity: DiagnosticSeverity.Warning,
        code: 1,
        source: 'provider1',
        message: 'Test diagnostic',
        // No fingerprint
      };

      const result = env.workspace.dismissDiagnostic('file1', diagnostic);

      expect(result).toBe(false);
      expect(env.provider1.refresh).not.toHaveBeenCalled();
    });

    it('cleans up dismissed fingerprints when diagnostic no longer exists', async () => {
      const env = new TestEnvironment();
      const diagnostic1: Diagnostic = {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
        severity: DiagnosticSeverity.Warning,
        code: 1,
        source: 'provider1',
        message: 'Diagnostic 1',
        fingerprint: 'fingerprint1',
      };
      const diagnostic2: Diagnostic = {
        range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } },
        severity: DiagnosticSeverity.Warning,
        code: 2,
        source: 'provider1',
        message: 'Diagnostic 2',
        fingerprint: 'fingerprint2',
      };

      // Emit initial diagnostics
      env.provider1Subject.next({ uri: 'file1', version: 1, diagnostics: [diagnostic1, diagnostic2] });

      // Dismiss both diagnostics
      env.workspace.dismissDiagnostic('file1', diagnostic1);
      env.workspace.dismissDiagnostic('file1', diagnostic2);

      // Now emit diagnostics with only diagnostic2 present (diagnostic1 was fixed)
      const changedPromise = firstValueFrom(env.workspace.diagnosticsChanged$);
      env.provider1Subject.next({ uri: 'file1', version: 2, diagnostics: [diagnostic2] });
      const changed = await changedPromise;

      expect(changed.uri).toEqual('file1');
      // diagnostic2 is still dismissed, so no diagnostics should be shown
      expect(changed.diagnostics).toHaveLength(0);

      // Now emit with no diagnostics (both were fixed)
      const changedPromise2 = firstValueFrom(env.workspace.diagnosticsChanged$);
      env.provider1Subject.next({ uri: 'file1', version: 3, diagnostics: [diagnostic1] });
      const changed2 = await changedPromise2;

      expect(changed2.diagnostics).toHaveLength(1);
      expect(changed2.diagnostics[0].message).toEqual('Diagnostic 1');
    });
  });

  describe('getDiagnostics', () => {
    it('filters out dismissed diagnostics', async () => {
      const env = new TestEnvironment();
      const diagnostics: Diagnostic[] = [
        {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
          severity: DiagnosticSeverity.Warning,
          code: 1,
          source: 'provider1',
          message: 'Diagnostic 1',
          fingerprint: 'fingerprint1',
        },
        {
          range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } },
          severity: DiagnosticSeverity.Warning,
          code: 2,
          source: 'provider1',
          message: 'Diagnostic 2',
          fingerprint: 'fingerprint2',
        },
        {
          range: { start: { line: 2, character: 0 }, end: { line: 2, character: 5 } },
          severity: DiagnosticSeverity.Error,
          code: 3,
          source: 'provider1',
          message: 'Diagnostic 3',
          fingerprint: 'fingerprint3',
        },
      ];

      // Mock provider to return diagnostics
      env.provider1.getDiagnostics.mockResolvedValue(diagnostics);

      // Get diagnostics before dismissing any
      const allDiagnostics = await env.workspace.getDiagnostics('file1');
      expect(allDiagnostics).toHaveLength(3);
      expect(allDiagnostics.map((d) => d.message)).toEqual(['Diagnostic 1', 'Diagnostic 2', 'Diagnostic 3']);

      // Dismiss the first diagnostic
      const dismissed1 = env.workspace.dismissDiagnostic('file1', diagnostics[0]);
      expect(dismissed1).toBe(true);

      // Get diagnostics after dismissing one
      const afterFirstDismiss = await env.workspace.getDiagnostics('file1');
      expect(afterFirstDismiss).toHaveLength(2);
      expect(afterFirstDismiss.map((d) => d.message)).toEqual(['Diagnostic 2', 'Diagnostic 3']);

      // Dismiss the third diagnostic
      const dismissed2 = env.workspace.dismissDiagnostic('file1', diagnostics[2]);
      expect(dismissed2).toBe(true);

      // Get diagnostics after dismissing two
      const afterSecondDismiss = await env.workspace.getDiagnostics('file1');
      expect(afterSecondDismiss).toHaveLength(1);
      expect(afterSecondDismiss[0].message).toEqual('Diagnostic 2');
      expect(afterSecondDismiss[0].fingerprint).toEqual('fingerprint2');
    });

    it('combines diagnostics from multiple providers and filters dismissed ones', async () => {
      const env = new TestEnvironment();
      const diagnostics1: Diagnostic[] = [
        {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
          severity: DiagnosticSeverity.Warning,
          code: 1,
          source: 'provider1',
          message: 'Provider 1 diagnostic',
          fingerprint: 'fp1',
        },
      ];
      const diagnostics2: Diagnostic[] = [
        {
          range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } },
          severity: DiagnosticSeverity.Error,
          code: 2,
          source: 'provider2',
          message: 'Provider 2 diagnostic',
          fingerprint: 'fp2',
        },
      ];

      env.provider1.getDiagnostics.mockResolvedValue(diagnostics1);
      env.provider2.getDiagnostics.mockResolvedValue(diagnostics2);

      // Get all diagnostics from both providers
      const allDiagnostics = await env.workspace.getDiagnostics('file1');
      expect(allDiagnostics).toHaveLength(2);
      expect(allDiagnostics.find((d) => d.source === 'provider1')).toBeDefined();
      expect(allDiagnostics.find((d) => d.source === 'provider2')).toBeDefined();

      // Dismiss diagnostic from provider1
      env.workspace.dismissDiagnostic('file1', diagnostics1[0]);

      // Get diagnostics after dismissal
      const afterDismiss = await env.workspace.getDiagnostics('file1');
      expect(afterDismiss).toHaveLength(1);
      expect(afterDismiss[0].source).toEqual('provider2');
      expect(afterDismiss[0].message).toEqual('Provider 2 diagnostic');
    });

    it('does not affect diagnostics from different URIs', async () => {
      const env = new TestEnvironment();
      const diagnostic1: Diagnostic = {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
        severity: DiagnosticSeverity.Warning,
        code: 1,
        source: 'provider1',
        message: 'Diagnostic for file1',
        fingerprint: 'fp1',
      };
      const diagnostic2: Diagnostic = {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
        severity: DiagnosticSeverity.Warning,
        code: 2,
        source: 'provider1',
        message: 'Diagnostic for file2',
        fingerprint: 'fp2',
      };

      // Setup provider to return diagnostics based on URI
      env.provider1.getDiagnostics.mockImplementation((uri: string) => {
        let diagnostics: Diagnostic[] = [];
        if (uri === 'file1') {
          diagnostics = [diagnostic1];
        } else if (uri === 'file2') {
          diagnostics = [diagnostic2];
        }
        return Promise.resolve(diagnostics);
      });

      // Dismiss diagnostic for file1
      env.workspace.dismissDiagnostic('file1', diagnostic1);

      // Verify file1 has no diagnostics
      const file1Diagnostics = await env.workspace.getDiagnostics('file1');
      expect(file1Diagnostics).toHaveLength(0);

      // Verify file2 still has its diagnostic
      const file2Diagnostics = await env.workspace.getDiagnostics('file2');
      expect(file2Diagnostics).toHaveLength(1);
      expect(file2Diagnostics[0].message).toEqual('Diagnostic for file2');
    });
  });
});

class TestEnvironment {
  readonly localizer: MockProxy<Localizer>;
  readonly provider1: MockProxy<DiagnosticProvider>;
  readonly provider2: MockProxy<DiagnosticProvider>;
  readonly provider1Subject: Subject<DiagnosticsChanged>;
  readonly provider2Subject: Subject<DiagnosticsChanged>;
  readonly workspace: Workspace;

  constructor() {
    this.localizer = mock<Localizer>();
    this.localizer.init.mockResolvedValue();

    this.provider1Subject = new Subject<DiagnosticsChanged>();
    this.provider1 = mock<DiagnosticProvider>(
      Object.create({
        id: 'provider1',
        diagnosticsChanged$: this.provider1Subject.asObservable(),
      }),
    );
    this.provider1.init.mockResolvedValue();
    this.provider1.getDiagnostics.mockResolvedValue([]);
    this.provider1.getDiagnosticFixes.mockResolvedValue([]);

    this.provider2Subject = new Subject<DiagnosticsChanged>();
    this.provider2 = mock<DiagnosticProvider>(
      Object.create({
        id: 'provider2',
        diagnosticsChanged$: this.provider2Subject.asObservable(),
      }),
    );
    this.provider2.init.mockResolvedValue();
    this.provider2.getDiagnostics.mockResolvedValue([]);
    this.provider2.getDiagnosticFixes.mockResolvedValue([]);

    this.workspace = new Workspace({
      localizer: this.localizer,
      diagnosticProviders: [this.provider1, this.provider2],
    });
  }
}
