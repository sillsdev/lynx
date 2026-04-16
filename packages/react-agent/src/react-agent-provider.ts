import { AIMessageChunk } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import {
  AgentEvent,
  AgentEventType,
  AgentProvider,
  AgentResponse,
  DiagnosticProvider,
  TextEdit,
  TodoStatus,
} from '@sillsdev/lynx';
import { Observable, Subject } from 'rxjs';

import { createAgentGraph } from './graph/agent-graph';
import { ReactAgentConfig } from './react-agent-config';

type AgentGraph = ReturnType<typeof createAgentGraph>;

const DEFAULT_SYSTEM_PROMPT = `You are a Bible translation assistant integrated into the Lynx workspace.
You help users with translation quality checks, formatting, and general Bible translation tasks.

You have access to workspace tools that let you:
- Check documents for translation quality issues (diagnostics)
- Get suggested fixes for specific issues
- Dismiss issues that are intentional
- Execute fix commands
- Get formatting edits

When users ask about translation issues, first check the diagnostics for the relevant document.
When suggesting fixes, use the diagnostic actions system to propose concrete edits.
An action will either contain a \`command\` to execute by calling \`execute_diagnostic_command\` or \`edits\` to apply directly to the document.
Always explain your reasoning in the context of Bible translation best practices.`;

export class ReactAgentProvider<T = TextEdit> implements AgentProvider {
  readonly config: ReactAgentConfig<T>;

  private agent?: AgentGraph;
  private readonly eventsSubject = new Subject<AgentEvent>();

  readonly events$: Observable<AgentEvent> = this.eventsSubject.asObservable();

  constructor(config: ReactAgentConfig<T>) {
    this.config = config;
  }

  init(): Promise<void> {
    this.agent = createAgentGraph({
      model: this.config.model,
      systemPrompt: this.config.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
      documents: this.config.documents,
      diagnosticProviders: this.config.diagnosticProviders as DiagnosticProvider<unknown>[] | undefined,
      applyEdit: this.config.applyEdit as ((uri: string, edits: unknown[]) => Promise<void>) | undefined,
      tools: this.config.tools,
      subagents: this.config.subAgents,
      checkpointer: new MemorySaver(),
    });
    return Promise.resolve();
  }

  async run(input: string, threadId?: string): Promise<AgentResponse> {
    if (this.agent == null) {
      throw new Error('Agent not initialized. Call init() first.');
    }

    const runId = crypto.randomUUID();
    const resolvedThreadId = threadId ?? crypto.randomUUID();

    this.emitEvent({
      type: AgentEventType.Started,
      timestamp: Date.now(),
      runId,
    });

    try {
      const result = await this.agent.invoke(
        { messages: [{ role: 'user', content: input }] },
        { configurable: { thread_id: resolvedThreadId } },
      );

      const lastMessage = result.messages[result.messages.length - 1];
      const finalMessage =
        typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content);

      this.emitEvent({
        type: AgentEventType.Completed,
        timestamp: Date.now(),
        runId,
        finalMessage,
      });

      return { runId, message: finalMessage };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.emitEvent({
        type: AgentEventType.Error,
        timestamp: Date.now(),
        runId,
        error: errorMessage,
      });
      throw err;
    }
  }

  stream(input: string, threadId?: string): Observable<AgentEvent> {
    return new Observable<AgentEvent>((subscriber) => {
      if (this.agent == null) {
        subscriber.error(new Error('Agent not initialized. Call init() first.'));
        return;
      }

      const runId = crypto.randomUUID();
      const resolvedThreadId = threadId ?? crypto.randomUUID();
      let aborted = false;

      const execute = async () => {
        const startedEvent: AgentEvent = {
          type: AgentEventType.Started,
          timestamp: Date.now(),
          runId,
        };
        subscriber.next(startedEvent);
        this.eventsSubject.next(startedEvent);

        try {
          const agentStream = await this.agent!.stream(
            { messages: [{ role: 'user', content: input }] },
            {
              streamMode: 'updates',
              configurable: { thread_id: resolvedThreadId },
            },
          );

          let finalMessage = '';

          for await (const event of agentStream) {
            if (aborted) break;

            const agentEvents = this.mapStreamEvent(runId, event);
            for (const agentEvent of agentEvents) {
              subscriber.next(agentEvent);
              this.eventsSubject.next(agentEvent);

              if (agentEvent.type === AgentEventType.Message && !agentEvent.isPartial) {
                finalMessage = agentEvent.content;
              }
            }
          }

          if (!aborted) {
            const completedEvent: AgentEvent = {
              type: AgentEventType.Completed,
              timestamp: Date.now(),
              runId,
              finalMessage,
            };
            subscriber.next(completedEvent);
            this.eventsSubject.next(completedEvent);
            subscriber.complete();
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          const errorEvent: AgentEvent = {
            type: AgentEventType.Error,
            timestamp: Date.now(),
            runId,
            error: errorMessage,
          };
          subscriber.next(errorEvent);
          this.eventsSubject.next(errorEvent);
          subscriber.error(err);
        }
      };

      void execute();

      return () => {
        aborted = true;
      };
    });
  }

  dispose(): Promise<void> {
    this.eventsSubject.complete();
    return Promise.resolve();
  }

  private mapStreamEvent(runId: string, event: Record<string, unknown>): AgentEvent[] {
    const events: AgentEvent[] = [];
    const timestamp = Date.now();

    // LangGraph stream events with streamMode 'updates' emit node-keyed objects.
    // The 'model_request' node contains AIMessages from the LLM (with optional tool_calls).
    if ('model_request' in event) {
      this.extractMessageEvents(event.model_request, runId, timestamp, events);
    }

    // The 'agent' node is an alternative key used in some LangGraph configurations.
    if ('agent' in event) {
      this.extractMessageEvents(event.agent, runId, timestamp, events);
    }

    // Tool execution results
    if ('tools' in event) {
      const toolsData = event.tools as { messages?: unknown[]; todos?: { content: string; status: TodoStatus }[] };
      if (toolsData.todos) {
        events.push({
          type: AgentEventType.Todos,
          timestamp,
          runId,
          todos: toolsData.todos,
        });
      } else if (toolsData.messages) {
        for (const msg of toolsData.messages) {
          const message = msg as {
            name?: string;
            content?: unknown;
            kwargs?: { name?: string; content?: unknown };
          };
          events.push({
            type: AgentEventType.ToolResult,
            timestamp,
            runId,
            toolName: message.kwargs?.name ?? message.name ?? 'unknown',
            result: message.kwargs?.content ?? message.content,
          });
        }
      }
    }

    return events;
  }

  private extractMessageEvents(data: unknown, runId: string, timestamp: number, events: AgentEvent[]): void {
    const nodeData = data as { messages?: AIMessageChunk[] };
    if (!nodeData.messages) return;

    for (const message of nodeData.messages) {
      // Handle both raw and serialized (lc constructor) message formats
      const text = message.text;
      if (text) {
        events.push({
          type: AgentEventType.Message,
          timestamp,
          runId,
          content: text,
          isPartial: false,
        });
      }

      const toolCalls = message.tool_calls;
      if (toolCalls) {
        for (const toolCall of toolCalls) {
          events.push({
            type: AgentEventType.ToolCall,
            timestamp,
            runId,
            toolName: toolCall.name,
            args: toolCall.args,
          });
        }
      }
    }
  }

  private emitEvent(event: AgentEvent): void {
    this.eventsSubject.next(event);
  }
}
