import {
  Diagnostic,
  DiagnosticAction,
  DiagnosticSeverity,
  DocumentAccessor,
  DocumentManager,
  ScriptureDocument,
  TextDocument,
  TextDocumentFactory,
} from '@sillsdev/lynx';
import { UsfmDocumentFactory } from '@sillsdev/lynx-usfm';
import { UsfmStylesheet } from '@sillsdev/machine/corpora';
import { expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { AbstractChecker } from '../src/abstract-checker';
import { CheckableGroup, TextDocumentCheckable } from '../src/checkable';
import { DiagnosticFactory } from '../src/diagnostic-factory';
import { IssueFinder } from '../src/issue-finder';
import { StubScriptureDocumentManager, StubTextDocumentManager } from './test-utils';

it('calls produceDiagnostics once when given a TextDocument', async () => {
  const testEnv: TestEnvironment = new TestEnvironment();

  expect(await testEnv.getTextDocumentChecker().getDiagnostics('this is a test document')).toEqual([
    {
      code: 'single-text-node-passed',
      source: 'mock-issue-finder',
      range: {
        start: {
          line: 0,
          character: 0,
        },
        end: {
          line: 0,
          character: 1,
        },
      },
      severity: DiagnosticSeverity.Error,
      message: 'this is a test document',
    },
  ]);
});

it('calls produceScriptureDiagnostics once when given a ScriptureDocument with a single verse text node', async () => {
  const testEnv: TestEnvironment = new TestEnvironment();

  expect(await testEnv.getScriptureDocumentChecker().getDiagnostics('\\c 1 \\v 1 this is test scripture text')).toEqual(
    [
      {
        code: 'single-scripture-node-passed',
        source: 'mock-issue-finder',
        range: {
          start: {
            line: 0,
            character: 0,
          },
          end: {
            line: 0,
            character: 1,
          },
        },
        severity: DiagnosticSeverity.Error,
        message: 'this is test scripture text',
      },
    ],
  );
});

it('calls produceScriptureDiagnostics once when given a ScriptureDocument with multiple verses and no other text nodes', async () => {
  const testEnv: TestEnvironment = new TestEnvironment();

  expect(
    await testEnv
      .getScriptureDocumentChecker()
      .getDiagnostics('\\c 1 \\v 1 this is test scripture text \\v 2 some more text \\v 3 and the end'),
  ).toEqual([
    {
      code: 'multiple-scripture-nodes-passed',
      source: 'mock-issue-finder',
      range: {
        start: {
          line: 0,
          character: 0,
        },
        end: {
          line: 0,
          character: 1,
        },
      },
      severity: DiagnosticSeverity.Error,
      message: 'this is test scripture text ***some more text ***and the end',
    },
  ]);
});

it('calls produceScriptureDiagnostics once when given a ScriptureDocument a footnote and no other text nodes', async () => {
  const testEnv: TestEnvironment = new TestEnvironment();

  expect(
    await testEnv
      .getScriptureDocumentChecker()
      .getDiagnostics('\\f + \\fr 1.1: \\ft Some manuscripts do not have \\fq the Son of God.\\f*'),
  ).toEqual([
    {
      code: 'multiple-scripture-nodes-passed',
      source: 'mock-issue-finder',
      range: {
        start: {
          line: 0,
          character: 0,
        },
        end: {
          line: 0,
          character: 1,
        },
      },
      severity: DiagnosticSeverity.Error,
      message: '1.1: ***Some manuscripts do not have ***the Son of God.',
    },
  ]);
});

it('calls produceScriptureDiagnostics once for each non-verse text node and one with all the verse text nodes', async () => {
  const testEnv: TestEnvironment = new TestEnvironment();

  expect(
    await testEnv
      .getScriptureDocumentChecker()
      .getDiagnostics(
        '\\toc book name \\c 1 \\v 1 this is test scripture \\f + with a footnote \\f* text \\v 2 some more text \\v 3 and the end',
      ),
  ).toEqual([
    {
      code: 'single-scripture-node-passed',
      source: 'mock-issue-finder',
      range: {
        start: {
          line: 0,
          character: 0,
        },
        end: {
          line: 0,
          character: 1,
        },
      },
      severity: DiagnosticSeverity.Error,
      message: 'book name',
    },
    {
      code: 'multiple-scripture-nodes-passed',
      source: 'mock-issue-finder',
      range: {
        start: {
          line: 0,
          character: 0,
        },
        end: {
          line: 0,
          character: 1,
        },
      },
      severity: DiagnosticSeverity.Error,
      message: 'this is test scripture *** text ***some more text ***and the end',
    },
    {
      code: 'single-scripture-node-passed',
      source: 'mock-issue-finder',
      range: {
        start: {
          line: 0,
          character: 0,
        },
        end: {
          line: 0,
          character: 1,
        },
      },
      severity: DiagnosticSeverity.Error,
      message: 'with a footnote ',
    },
  ]);
});

class TestEnvironment {
  private readonly textDocumentChecker: AbstractChecker<TextDocument>;
  private readonly scriptureDocumentChecker: AbstractChecker<ScriptureDocument>;

  constructor() {
    const createDiagnostic = (checkableGroup: CheckableGroup) => {
      const types: string[] = [];
      const texts: string[] = [];
      for (const checkable of checkableGroup) {
        texts.push(checkable.getText());
        if (checkable instanceof TextDocumentCheckable) {
          types.push('text');
        } else {
          types.push('scripture');
        }
      }

      if (texts.length === 1 && types[0] === 'text') {
        return {
          code: 'single-text-node-passed',
          source: 'mock-issue-finder',
          range: {
            start: {
              line: 0,
              character: 0,
            },
            end: {
              line: 0,
              character: 1,
            },
          },
          severity: DiagnosticSeverity.Error,
          message: texts[0],
        };
      }
      if (texts.length === 1 && types[0] === 'scripture') {
        return {
          code: 'single-scripture-node-passed',
          source: 'mock-issue-finder',
          range: {
            start: {
              line: 0,
              character: 0,
            },
            end: {
              line: 0,
              character: 1,
            },
          },
          severity: DiagnosticSeverity.Error,
          message: texts[0],
        };
      }
      if (texts.length > 1 && types[0] === 'text') {
        return {
          code: 'multiple-text-nodes-passed',
          source: 'mock-issue-finder',
          range: {
            start: {
              line: 0,
              character: 0,
            },
            end: {
              line: 0,
              character: 1,
            },
          },
          severity: DiagnosticSeverity.Error,
          message: texts.join('***'),
        };
      }
      return {
        code: 'multiple-scripture-nodes-passed',
        source: 'mock-issue-finder',
        range: {
          start: {
            line: 0,
            character: 0,
          },
          end: {
            line: 0,
            character: 1,
          },
        },
        severity: DiagnosticSeverity.Error,
        message: texts.join('***'),
      };
    };
    const mockIssueFinder = mock<IssueFinder>({
      produceDiagnostics(checkableGroup: CheckableGroup): Promise<Diagnostic[]> {
        return Promise.resolve([createDiagnostic(checkableGroup)]);
      },
    });

    class StubChecker<T extends TextDocument | ScriptureDocument> extends AbstractChecker<T> {
      constructor(documentManager: DocumentAccessor<T>) {
        super('stub-checker', documentManager, {
          createIssueFinder(_diagnosticFactory: DiagnosticFactory) {
            return mockIssueFinder;
          },
        });
      }

      protected getFixes(_document: T, _diagnostic: Diagnostic): DiagnosticAction[] {
        return [];
      }
    }

    const textDocumentManager: DocumentManager<TextDocument> = new StubTextDocumentManager(new TextDocumentFactory());
    this.textDocumentChecker = new StubChecker(textDocumentManager);

    const stylesheet: UsfmStylesheet = new UsfmStylesheet('usfm.sty');
    const scriptureDocumentManager: DocumentManager<ScriptureDocument> = new StubScriptureDocumentManager(
      new UsfmDocumentFactory(stylesheet),
    );
    this.scriptureDocumentChecker = new StubChecker(scriptureDocumentManager);
  }

  public getTextDocumentChecker(): AbstractChecker<TextDocument> {
    return this.textDocumentChecker;
  }

  public getScriptureDocumentChecker(): AbstractChecker<ScriptureDocument> {
    return this.scriptureDocumentChecker;
  }
}
