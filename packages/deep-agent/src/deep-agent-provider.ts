import { StructuredTool } from '@langchain/core/tools';
import { MemorySaver } from '@langchain/langgraph';
import { AgentEvent, AgentEventType, AgentProvider, AgentResponse, TextEdit, TodoStatus } from '@sillsdev/lynx';
import { createDeepAgent } from 'deepagents';
import { AIMessageChunk, tool } from 'langchain';
import { Observable, Subject } from 'rxjs';

import { DeepAgentConfig } from './deep-agent-config';
import { DeepAgentToolDefinition } from './deep-agent-tool';
import { createApplyEditTool, createDiagnosticProviderTools, createDocumentAccessorTools } from './deep-agent-tools';

type DeepAgent = ReturnType<typeof createDeepAgent>;

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
You should use the \`apply_edit\` tool to apply \`edits\` to a document.
Always explain your reasoning in the context of Bible translation best practices.
File system tools, such as \`edit_file\`, \`read_file\`, \`write_file\`, \`ls\`, etc., should only be used for scratch files, never for actual translation documents.`;

export class DeepAgentProvider<T = TextEdit> implements AgentProvider {
  readonly config: DeepAgentConfig<T>;

  private agent?: DeepAgent;
  private readonly eventsSubject = new Subject<AgentEvent>();

  readonly events$: Observable<AgentEvent> = this.eventsSubject.asObservable();

  constructor(config: DeepAgentConfig<T>) {
    this.config = config;
  }

  init(): Promise<void> {
    const tools = this.buildTools();
    const subagents = this.config.subAgents?.map((sa) => ({
      name: sa.name,
      description: sa.description,
      systemPrompt: sa.systemPrompt,
      model: sa.model,
      tools: sa.tools?.map((t) => this.convertTool(t)),
    }));

    this.agent = createDeepAgent({
      model: this.config.model,
      systemPrompt: this.config.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
      tools,
      subagents,
      skills: this.config.skills,
      checkpointer: new MemorySaver(),
    });
    return Promise.resolve();
  }

  async run(input: string, threadId?: string): Promise<AgentResponse> {
    if (this.agent == null) {
      throw new Error('Agent not initialized. Call init() first.');
    }

    const runId = crypto.randomUUID();

    this.emitEvent({
      type: AgentEventType.Started,
      timestamp: Date.now(),
      runId,
    });

    try {
      const result = await this.agent.invoke(
        { messages: [{ role: 'user', content: input }] },
        threadId != null ? { configurable: { thread_id: threadId } } : undefined,
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
              ...(threadId != null ? { configurable: { thread_id: threadId } } : undefined),
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

  private buildTools(): StructuredTool[] {
    const tools: StructuredTool[] = (this.config.tools ?? []).map((t) => this.convertTool(t));

    if (this.config.diagnosticProviders != null && this.config.diagnosticProviders.length > 0) {
      tools.push(...createDiagnosticProviderTools(this.config.diagnosticProviders));
    }

    tools.push(...createDocumentAccessorTools(this.config.documents));

    tools.push(createApplyEditTool(this.config.applyEdit as (uri: string, edits: unknown[]) => Promise<void>));

    return tools;
  }

  private convertTool(def: DeepAgentToolDefinition) {
    return tool(async (args: Record<string, unknown>) => def.execute(args), {
      name: def.name,
      description: def.description,
      schema: def.schema,
    });
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
