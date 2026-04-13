import {
  AgentEventType,
  Diagnostic,
  type DiagnosticsChanged,
  DiagnosticSeverity,
  DocumentManager,
  Localizer,
  type Range,
  ScriptureDocument,
  type TextEdit,
  TodoStatus,
  Workspace,
} from '@sillsdev/lynx';
import { DeepAgentProvider } from '@sillsdev/lynx-deep-agent';
import {
  JsonFileDiagnosticDismissalStore,
  SimpleQuoteFormattingProvider,
  VerseOrderDiagnosticProvider,
} from '@sillsdev/lynx-examples';
import { StandardRuleSets } from '@sillsdev/lynx-punctuation-checker';
import { UsfmDocumentFactory, UsfmEditFactory } from '@sillsdev/lynx-usfm';
import { UsfmStylesheet } from '@sillsdev/machine/corpora';
import { initChatModel } from 'langchain/chat_models/universal';
import * as vscode from 'vscode';

type AgentProvider = 'anthropic' | 'openai' | 'google-genai';

const DEFAULT_MODELS = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-4o',
  'google-genai': 'gemini-2.0-flash',
} as const satisfies Record<AgentProvider, string>;

const USFM_SELECTOR = { language: 'usfm', scheme: 'file' };
const PARTICIPANT_ID = 'lynx.chatParticipant';

function emptyToUndefined(value: string | undefined): string | undefined {
  return value === '' ? undefined : value;
}

function toVscodeRange(range: Range): vscode.Range {
  return new vscode.Range(
    new vscode.Position(range.start.line, range.start.character),
    new vscode.Position(range.end.line, range.end.character),
  );
}

function fromVscodeRange(range: vscode.Range): Range {
  return {
    start: { line: range.start.line, character: range.start.character },
    end: { line: range.end.line, character: range.end.character },
  };
}

function toVscodeDiagnostic(diag: Diagnostic): vscode.Diagnostic {
  const vscodeDiag = new vscode.Diagnostic(
    toVscodeRange(diag.range),
    diag.message,
    toVscodeDiagnosticSeverity(diag.severity),
  );
  vscodeDiag.code = diag.code;
  vscodeDiag.source = diag.source;
  return vscodeDiag;
}

function toVscodeDiagnosticSeverity(severity: DiagnosticSeverity): vscode.DiagnosticSeverity {
  switch (severity) {
    case DiagnosticSeverity.Error:
      return vscode.DiagnosticSeverity.Error;
    case DiagnosticSeverity.Warning:
      return vscode.DiagnosticSeverity.Warning;
    case DiagnosticSeverity.Information:
      return vscode.DiagnosticSeverity.Information;
    case DiagnosticSeverity.Hint:
      return vscode.DiagnosticSeverity.Hint;
    default:
      return vscode.DiagnosticSeverity.Error;
  }
}

function toVscodeTextEdit(edit: TextEdit): vscode.TextEdit {
  return new vscode.TextEdit(toVscodeRange(edit.range), edit.newText);
}

function toVscodeTodoStatus(status: TodoStatus): vscode.ChatTodoStatus {
  switch (status) {
    case TodoStatus.Pending:
      return vscode.ChatTodoStatus.NotStarted;
    case TodoStatus.InProgress:
      return vscode.ChatTodoStatus.InProgress;
    case TodoStatus.Completed:
      return vscode.ChatTodoStatus.Completed;
  }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const config = vscode.workspace.getConfiguration('lynx');
  const dismissalFilePath = config.get<string>('diagnosticDismissalFilePath');
  const agentEnabled = config.get<boolean>('agent.enabled') ?? false;
  const agentProviderName = (config.get<string>('agent.provider') ?? 'anthropic') as AgentProvider;
  const agentApiKey = emptyToUndefined(config.get<string>('agent.apiKey'));

  const localizer = new Localizer();
  const stylesheet = new UsfmStylesheet('usfm.sty');
  const documentFactory = new UsfmDocumentFactory(stylesheet);
  const editFactory = new UsfmEditFactory(stylesheet);
  const documentManager = new DocumentManager<ScriptureDocument>(documentFactory);
  const ruleSet = StandardRuleSets.English;

  const diagnosticProviders = [
    ...ruleSet.createDiagnosticProviders(localizer, documentManager, editFactory),
    new VerseOrderDiagnosticProvider(localizer, documentManager, editFactory),
  ];

  let agentProvider: DeepAgentProvider | undefined;
  if (agentEnabled) {
    const agentModel = emptyToUndefined(config.get<string>('agent.model')) ?? DEFAULT_MODELS[agentProviderName];
    const model = await initChatModel(agentModel, {
      modelProvider: agentProviderName,
      apiKey: agentApiKey,
    });
    agentProvider = new DeepAgentProvider({
      model,
      documents: documentManager,
      applyEdit: async (uri, edits) => {
        const docUri = vscode.Uri.parse(uri);
        const wsEdit = new vscode.WorkspaceEdit();
        wsEdit.set(docUri, edits.map(toVscodeTextEdit));
        await vscode.workspace.applyEdit(wsEdit);
      },
      diagnosticProviders,
    });
  }

  const workspace = new Workspace({
    localizer,
    diagnosticProviders,
    onTypeFormattingProviders: [
      ...ruleSet.createOnTypeFormattingProviders(documentManager, editFactory),
      new SimpleQuoteFormattingProvider(documentManager, editFactory),
    ],
    agentProvider,
    diagnosticDismissalStore: dismissalFilePath ? new JsonFileDiagnosticDismissalStore(dismissalFilePath) : undefined,
  });

  await workspace.init();
  await workspace.changeLanguage(vscode.env.language);

  // Maps URI -> (vscode.Diagnostic -> Lynx Diagnostic) for code action lookups
  const lynxDiagnosticMap = new Map<string, Map<vscode.Diagnostic, Diagnostic>>();

  const diagnosticCollection = vscode.languages.createDiagnosticCollection('lynx');
  context.subscriptions.push(diagnosticCollection);

  const diagnosticsSubscription = workspace.diagnosticsChanged$.subscribe((event: DiagnosticsChanged) => {
    const innerMap = new Map<vscode.Diagnostic, Diagnostic>();
    for (const diag of event.diagnostics) {
      const vscodeDiag = toVscodeDiagnostic(diag);
      innerMap.set(vscodeDiag, diag);
    }
    lynxDiagnosticMap.set(event.uri, innerMap);
    diagnosticCollection.set(vscode.Uri.parse(event.uri), Array.from(innerMap.keys()));
  });
  context.subscriptions.push(
    new vscode.Disposable(() => {
      diagnosticsSubscription.unsubscribe();
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => {
      if (doc.languageId !== 'usfm') return;
      void documentManager.fireOpened(doc.uri.toString(), {
        format: doc.languageId,
        version: doc.version,
        content: doc.getText(),
      });
    }),
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.languageId !== 'usfm') return;
      void documentManager.fireChanged(e.document.uri.toString(), {
        version: e.document.version,
        contentChanges: e.contentChanges.map((c) => ({ range: fromVscodeRange(c.range), text: c.text })),
      });
    }),
    vscode.workspace.onDidCloseTextDocument((doc) => {
      if (doc.languageId !== 'usfm') return;
      lynxDiagnosticMap.delete(doc.uri.toString());
      void documentManager.fireClosed(doc.uri.toString());
    }),
  );

  for (const doc of vscode.workspace.textDocuments) {
    if (doc.languageId !== 'usfm') continue;
    void documentManager.fireOpened(doc.uri.toString(), {
      format: doc.languageId,
      version: doc.version,
      content: doc.getText(),
    });
  }

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      USFM_SELECTOR,
      {
        async provideCodeActions(document, _range, actionContext) {
          const uri = document.uri.toString();
          const uriMap = lynxDiagnosticMap.get(uri);
          if (uriMap == null) return [];

          const actions: vscode.CodeAction[] = [];
          for (const vscodeDiag of actionContext.diagnostics) {
            const lynxDiag = uriMap.get(vscodeDiag);
            if (lynxDiag == null) continue;

            const lynxActions = await workspace.getDiagnosticActions(uri, lynxDiag);
            for (const lynxAction of lynxActions) {
              const action = new vscode.CodeAction(lynxAction.title, vscode.CodeActionKind.QuickFix);
              action.diagnostics = [vscodeDiag];
              action.isPreferred = lynxAction.isPreferred;

              if (lynxAction.edits != null) {
                action.edit = new vscode.WorkspaceEdit();
                action.edit.set(document.uri, lynxAction.edits.map(toVscodeTextEdit));
              }
              if (lynxAction.command != null) {
                action.command = {
                  title: lynxAction.title,
                  command: `lynx.${lynxDiag.source}.${lynxAction.command}`,
                  arguments: [uri, lynxDiag],
                };
              }
              actions.push(action);
            }

            if (lynxDiag.fingerprint != null) {
              const dismissAction = new vscode.CodeAction('Dismiss', vscode.CodeActionKind.QuickFix);
              dismissAction.command = {
                title: 'Dismiss Diagnostic',
                command: 'lynx.dismissDiagnostic',
                arguments: [uri, lynxDiag],
              };
              actions.push(dismissAction);
            }
          }
          return actions;
        },
      },
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('lynx.dismissDiagnostic', async (uri: string, diagnostic: Diagnostic) => {
      await workspace.dismissDiagnostic(uri, diagnostic);
    }),
  );
  for (const [provider, command] of workspace.getDiagnosticActionCommands()) {
    context.subscriptions.push(
      vscode.commands.registerCommand(`lynx.${provider}.${command}`, async (uri: string, diagnostic: Diagnostic) => {
        await workspace.executeDiagnosticActionCommand(command, uri, diagnostic);
      }),
    );
  }

  const triggerCharacters = workspace.getOnTypeTriggerCharacters();
  if (triggerCharacters.length > 0) {
    context.subscriptions.push(
      vscode.languages.registerOnTypeFormattingEditProvider(
        USFM_SELECTOR,
        {
          async provideOnTypeFormattingEdits(document, position, ch) {
            const edits = await workspace.getOnTypeEdits(
              document.uri.toString(),
              { line: position.line, character: position.character },
              ch,
            );
            return edits?.map(toVscodeTextEdit);
          },
        },
        triggerCharacters[0],
        ...triggerCharacters.slice(1),
      ),
    );
  }

  if (agentEnabled) {
    const chatHandler: vscode.ChatRequestHandler = async (request, context, response, token) => {
      let threadId: string;
      if (context.history.length === 0) {
        threadId = crypto.randomUUID();
      } else {
        // check if the last message has a threadId in its metadata, if so use that, otherwise generate a new one
        let lastResponseTurn: vscode.ChatResponseTurn | undefined;
        for (let i = context.history.length - 1; i >= 0; i--) {
          const turn = context.history[i];
          if (turn instanceof vscode.ChatResponseTurn && turn.participant === PARTICIPANT_ID) {
            lastResponseTurn = turn;
            break;
          }
        }
        threadId = (lastResponseTurn?.result.metadata?.threadId as string | undefined) ?? crypto.randomUUID();
      }
      const events$ = workspace.streamAgent(request.prompt, threadId);

      return new Promise<vscode.ChatResult>((resolve) => {
        let todoCounter = 0;
        let currentTodoCallId: string | undefined;
        let lastTodoData: vscode.ChatTodoToolInvocationData | undefined;

        const hidePreviousTodos = () => {
          if (currentTodoCallId) {
            const hide = new vscode.ChatToolInvocationPart('todos', currentTodoCallId);
            hide.enablePartialUpdate = true;
            hide.isComplete = true;
            hide.presentation = 'hidden';
            response.push(hide);
          }
        };

        const completeTodos = () => {
          if (currentTodoCallId) {
            const part = new vscode.ChatToolInvocationPart('todos', currentTodoCallId);
            part.enablePartialUpdate = true;
            part.isComplete = true;
            part.toolSpecificData = lastTodoData;
            response.push(part);
          }
        };

        const subscription = events$.subscribe({
          next(event) {
            switch (event.type) {
              case AgentEventType.Started:
                response.progress('Thinking');
                break;
              case AgentEventType.Message:
                response.markdown(event.content);
                break;
              case AgentEventType.ToolCall:
                response.progress(`Running ${event.toolName}`);
                break;
              case AgentEventType.Todos: {
                // Workaround for VS Code bug: toolSpecificData updates don't trigger
                // UI re-renders, so we hide the old part and create a new one.
                hidePreviousTodos();
                todoCounter++;
                const callId = `lynx-todos-${todoCounter.toString()}`;
                currentTodoCallId = callId;
                lastTodoData = {
                  todoList: event.todos.map((t, i) => ({
                    id: i,
                    title: t.content,
                    status: toVscodeTodoStatus(t.status),
                  })),
                };
                const part = new vscode.ChatToolInvocationPart('todos', callId);
                part.enablePartialUpdate = true;
                part.isComplete = false;
                part.toolSpecificData = lastTodoData;
                response.push(part);
                break;
              }
              case AgentEventType.Error:
                completeTodos();
                resolve({ metadata: { threadId }, errorDetails: { message: event.error } });
                break;
              case AgentEventType.Completed:
                completeTodos();
                resolve({ metadata: { threadId } });
                break;
            }
          },
          error(err) {
            completeTodos();
            resolve({
              metadata: { threadId },
              errorDetails: { message: err instanceof Error ? err.message : String(err) },
            });
          },
        });

        const cancellationListener = token.onCancellationRequested(() => {
          completeTodos();
          subscription.unsubscribe();
          resolve({ metadata: { threadId } });
        });
        subscription.add(() => {
          cancellationListener.dispose();
        });
      });
    };

    const participant = vscode.chat.createChatParticipant(PARTICIPANT_ID, chatHandler);
    context.subscriptions.push(participant);
  }
}

export function deactivate(): void {
  // Subscriptions are cleaned up via context.subscriptions
}
