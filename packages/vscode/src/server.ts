import { Diagnostic, Workspace } from '@sillsdev/lynx';
import { UsfmDocumentFactory } from '@sillsdev/lynx-usfm';
import { UsfmStylesheet } from '@sillsdev/machine/corpora';
import {
  CodeAction,
  createConnection,
  type DocumentDiagnosticReport,
  DocumentDiagnosticReportKind,
  InitializeParams,
  InitializeResult,
  ProposedFeatures,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node';

import { SmartQuoteFormattingProvider } from './smart-quote-formatting-provider';
import { VerseOrderDiagnosticProvider } from './verse-order-diagnostic-provider';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const workspace = new Workspace({
  documentFactory: new UsfmDocumentFactory(new UsfmStylesheet('usfm.sty')),
  diagnosticProviders: [VerseOrderDiagnosticProvider],
  onTypeFormattingProviders: [SmartQuoteFormattingProvider],
});

let hasWorkspaceFolderCapability = false;

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  hasWorkspaceFolderCapability = capabilities.workspace?.workspaceFolders ?? false;

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      diagnosticProvider: {
        interFileDependencies: false,
        workspaceDiagnostics: false,
      },
      codeActionProvider: true,
    },
  };
  const onTypeTriggerCharacters = workspace.getOnTypeTriggerCharacters();
  if (onTypeTriggerCharacters.length > 0) {
    result.capabilities.documentOnTypeFormattingProvider = {
      firstTriggerCharacter: onTypeTriggerCharacters[0],
      moreTriggerCharacter: onTypeTriggerCharacters.slice(1),
    };
  }
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    };
  }
  return result;
});

connection.languages.diagnostics.on(async (params) => {
  return {
    kind: DocumentDiagnosticReportKind.Full,
    items: await workspace.getDiagnostics(params.textDocument.uri),
  } satisfies DocumentDiagnosticReport;
});

connection.onCodeAction(async (params) => {
  const actions: CodeAction[] = [];
  for (const diagnostic of params.context.diagnostics) {
    actions.push(
      ...(await workspace.getDiagnosticFixes(params.textDocument.uri, diagnostic as Diagnostic)).map((fix) => ({
        title: fix.title,
        kind: 'quickfix',
        diagnostics: [diagnostic],
        edit: {
          changes: {
            [params.textDocument.uri]: fix.edits,
          },
        },
      })),
    );
  }
  return actions;
});

connection.onDidOpenTextDocument((params) => {
  void workspace.documentManager.fireOpened(
    params.textDocument.uri,
    params.textDocument.languageId,
    params.textDocument.version,
    params.textDocument.text,
  );
});

connection.onDidCloseTextDocument((params) => {
  void workspace.documentManager.fireClosed(params.textDocument.uri);
});

connection.onDidChangeTextDocument((params) => {
  void workspace.documentManager.fireChanged(
    params.textDocument.uri,
    params.contentChanges,
    params.textDocument.version,
  );
});

connection.onDocumentOnTypeFormatting(async (params) => {
  return await workspace.getOnTypeEdits(params.textDocument.uri, params.position, params.ch);
});

// Listen on the connection
connection.listen();
