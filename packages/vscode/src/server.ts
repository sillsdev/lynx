import { UsfmStylesheet } from '@sillsdev/machine/corpora';
import { Diagnostic, ScriptureDocument, Workspace } from 'lynx-core';
import { UsfmDocumentFactory } from 'lynx-usfm';
import {
  CodeAction,
  createConnection,
  DidChangeConfigurationNotification,
  type DocumentDiagnosticReport,
  DocumentDiagnosticReportKind,
  InitializeParams,
  InitializeResult,
  ProposedFeatures,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node';

import { TestDiagnosticProvider, TestDiagnosticProviderConfig } from './test-diagnostic-provider';

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: TestDiagnosticProviderConfig = { maxNumberOfProblems: 1000 };
let globalSettings: TestDiagnosticProviderConfig = defaultSettings;

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const workspace = new Workspace<ScriptureDocument>({
  documentFactory: new UsfmDocumentFactory(new UsfmStylesheet('usfm.sty')),
  diagnosticProviders: [TestDiagnosticProvider.factory(() => globalSettings)],
});

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  // If not, we fall back using global settings.
  hasConfigurationCapability = capabilities.workspace?.configuration ?? false;
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
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    };
  }
  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    void connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log('Workspace folder change event received.');
    });
  }
});

connection.onDidChangeConfiguration((change) => {
  const settings = change.settings as Map<string, unknown>;
  globalSettings = (settings.get('lynxTest') as TestDiagnosticProviderConfig | undefined) ?? defaultSettings;
  // Refresh the diagnostics since the `maxNumberOfProblems` could have changed.
  // We could optimize things here and re-fetch the setting first can compare it
  // to the existing setting, but this is out of scope for this example.
  connection.languages.diagnostics.refresh();
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

connection.onDidChangeWatchedFiles((_change) => {
  // Monitored files have change in VSCode
  connection.console.log('We received a file change event');
});

// Listen on the connection
connection.listen();
