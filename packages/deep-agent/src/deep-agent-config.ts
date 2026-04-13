import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { DiagnosticProvider, DocumentAccessor, TextEdit } from '@sillsdev/lynx';

import { DeepAgentSubAgentDefinition } from './deep-agent-sub-agent';
import { DeepAgentToolDefinition } from './deep-agent-tool';

export interface DeepAgentConfig<T = TextEdit> {
  /** Model identifier string (e.g. "claude-sonnet-4-6") or a LangChain model instance */
  readonly model: string | BaseLanguageModel;
  /** Accessor for workspace documents */
  readonly documents: DocumentAccessor;
  /** Function that agent uses to apply an edit to a document */
  readonly applyEdit: (uri: string, edits: T[]) => Promise<void>;
  /** Diagnostic providers whose diagnostics and actions are exposed as agent tools */
  readonly diagnosticProviders?: DiagnosticProvider<T>[];
  /** Custom system prompt for the agent */
  readonly systemPrompt?: string;
  /** Custom tools available to the agent */
  readonly tools?: DeepAgentToolDefinition[];
  /** Sub-agents for delegation */
  readonly subAgents?: DeepAgentSubAgentDefinition[];
  /** Skill directory paths following agentskills.io standard */
  readonly skills?: string[];
}
