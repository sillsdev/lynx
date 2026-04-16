import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { StructuredTool, tool } from '@langchain/core/tools';
import { MemorySaver } from '@langchain/langgraph/web';
import { DiagnosticProvider, DocumentAccessor } from '@sillsdev/lynx';
import { createAgent, summarizationMiddleware, todoListMiddleware } from 'langchain';
import { z } from 'zod';

import type { ReactAgentSubAgentDefinition } from '../../react-agent-sub-agent';
import { ReactAgentToolDefinition } from '../../react-agent-tool';

const DEFAULT_SUBAGENT_NAME = 'general';

export function buildDefaultSubagent(
  systemPrompt: string,
  tools?: ReactAgentToolDefinition[],
): ReactAgentSubAgentDefinition {
  return {
    name: DEFAULT_SUBAGENT_NAME,
    description: 'General-purpose subagent for handling multi-step tasks',
    systemPrompt,
    tools,
  };
}

export interface BuiltinToolsConfig {
  documents?: DocumentAccessor;
  diagnosticProviders?: DiagnosticProvider<unknown>[];
  applyEdit?: (uri: string, edits: unknown[]) => Promise<void>;
  tools?: StructuredTool[];
}

export function createSubagentTool(
  subagents: ReactAgentSubAgentDefinition[],
  parentModel: string | BaseLanguageModel,
  builtinTools: StructuredTool[],
): StructuredTool {
  type CompiledSubagent = ReturnType<typeof createAgent>;
  const compiledSubagents = new Map<string, CompiledSubagent>();

  function getOrCreateSubagent(name: string): CompiledSubagent {
    if (!compiledSubagents.has(name)) {
      const config = subagents.find((s) => s.name === name);
      if (!config) {
        throw new Error(`Unknown subagent: ${name}`);
      }

      const allTools: StructuredTool[] = [
        ...(config.tools?.map((def) =>
          tool(async (args: Record<string, unknown>) => def.execute(args), {
            name: def.name,
            description: def.description,
            schema: def.schema,
          }),
        ) ?? []),
      ];
      if (name === DEFAULT_SUBAGENT_NAME) {
        // The default subagent gets access to all built-in tools
        allTools.push(...builtinTools);
      }

      compiledSubagents.set(
        name,
        createAgent({
          model: parentModel,
          tools: allTools,
          systemPrompt: config.systemPrompt,
          checkpointer: new MemorySaver(),
          middleware: [todoListMiddleware(), summarizationMiddleware({ model: parentModel })],
        }),
      );
    }
    return compiledSubagents.get(name)!;
  }

  const agentNames = subagents.map((s) => s.name);
  const agentDescriptions = subagents.map((s) => `${s.name} (${s.description})`).join(', ');

  return tool(
    async ({ agent, task }: { agent: string; task: string }) => {
      const subagent = getOrCreateSubagent(agent);
      const result = await subagent.invoke({
        messages: [{ role: 'user', content: task }],
      });
      const lastMsg = result.messages[result.messages.length - 1];
      return typeof lastMsg.content === 'string' ? lastMsg.content : JSON.stringify(lastMsg.content);
    },
    {
      name: 'task',
      description: `Delegate a task to a specialized subagent. Available agents: ${agentDescriptions}`,
      schema: z.object({
        agent: z.enum(agentNames as [string, ...string[]]).describe('The name of the subagent to delegate to'),
        task: z.string().describe('The task description to send to the subagent'),
      }),
    },
  );
}

export const TASK_SYSTEM_PROMPT = `## \`task\` (subagent spawner)

You have access to a \`task\` tool to launch short-lived subagents that handle isolated tasks. These agents are ephemeral \u2014 they live only for the duration of the task and return a single result.

When to use the task tool:
- When a task is complex and multi-step, and can be fully delegated in isolation
- When a task is independent of other tasks and can run in parallel
- When a task requires focused reasoning or heavy token/context usage that would bloat the orchestrator thread
- When you only care about the output of the subagent, and not the intermediate steps

Subagent lifecycle:
1. **Spawn** \u2192 Provide clear role, instructions, and expected output
2. **Run** \u2192 The subagent completes the task autonomously
3. **Return** \u2192 The subagent provides a single structured result
4. **Reconcile** \u2192 Incorporate or synthesize the result into the main thread

When NOT to use the task tool:
- If you need to see the intermediate reasoning or steps after the subagent has completed
- If the task is trivial (a few tool calls or simple lookup)
- If delegating does not reduce token usage, complexity, or context switching
- If splitting would add latency without benefit

## Important Task Tool Usage Notes
- Whenever possible, parallelize the work that you do. This is true for both tool_calls, and for tasks.
- Remember to use the \`task\` tool to silo independent tasks within a multi-part objective.
- You should use the \`task\` tool whenever you have a complex task that will take multiple steps, and is independent from other tasks.`;
