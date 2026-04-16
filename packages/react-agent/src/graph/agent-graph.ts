import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { StructuredTool, tool } from '@langchain/core/tools';
import { MemorySaver } from '@langchain/langgraph/web';
import { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { DiagnosticProvider, DocumentAccessor } from '@sillsdev/lynx';
import { createAgent, summarizationMiddleware, todoListMiddleware } from 'langchain';

import { ReactAgentSubAgentDefinition } from '../react-agent-sub-agent';
import { ReactAgentToolDefinition } from '../react-agent-tool';
import { createApplyEditTool } from './tools/appy-edit-tool';
import { createDiagnosticTools } from './tools/diagnostic-tools';
import { createDocumentTools } from './tools/document-tools';
import { buildDefaultSubagent, createSubagentTool, TASK_SYSTEM_PROMPT } from './tools/subagent-tool';

export interface CreateAgentGraphParams {
  model: string | BaseLanguageModel;
  systemPrompt: string;
  documents?: DocumentAccessor;
  diagnosticProviders?: DiagnosticProvider<unknown>[];
  applyEdit?: (uri: string, edits: unknown[]) => Promise<void>;
  tools?: ReactAgentToolDefinition[];
  subagents?: ReactAgentSubAgentDefinition[];
  checkpointer?: BaseCheckpointSaver;
}

export function createAgentGraph(params: CreateAgentGraphParams) {
  const { model, systemPrompt, documents, diagnosticProviders, applyEdit, tools, subagents, checkpointer } = params;

  const builtinTools: StructuredTool[] = [];

  if (documents != null) {
    builtinTools.push(...createDocumentTools(documents));
  }

  if (diagnosticProviders != null && diagnosticProviders.length > 0) {
    builtinTools.push(...createDiagnosticTools(diagnosticProviders));
  }

  if (applyEdit != null) {
    builtinTools.push(createApplyEditTool(applyEdit));
  }

  let fullPrompt = systemPrompt;
  const allSubagents = [buildDefaultSubagent(systemPrompt, tools), ...(subagents ?? [])];
  builtinTools.push(createSubagentTool(allSubagents, model, builtinTools.slice()));
  fullPrompt += '\n\n' + TASK_SYSTEM_PROMPT;

  const customTools = tools?.map((t) =>
    tool(async (args: Record<string, unknown>) => t.execute(args), {
      name: t.name,
      description: t.description,
      schema: t.schema,
    }),
  );

  return createAgent({
    model,
    tools: [...builtinTools, ...(customTools ?? [])],
    systemPrompt: fullPrompt,
    checkpointer: checkpointer ?? new MemorySaver(),
    middleware: [todoListMiddleware(), summarizationMiddleware({ model })],
  }).withConfig({
    recursionLimit: 10_000,
  });
}
