import { BaseLanguageModel } from '@langchain/core/language_models/base';

import { DeepAgentSubAgentDefinition } from './deep-agent-sub-agent';
import { DeepAgentToolDefinition } from './deep-agent-tool';

export interface DeepAgentConfig {
  /** Model identifier string (e.g. "claude-sonnet-4-6") or a LangChain model instance */
  readonly model: string | BaseLanguageModel;
  /** Custom system prompt for the agent */
  readonly systemPrompt?: string;
  /** Custom tools available to the agent */
  readonly tools?: DeepAgentToolDefinition[];
  /** Sub-agents for delegation */
  readonly subAgents?: DeepAgentSubAgentDefinition[];
  /** Skill directory paths following agentskills.io standard */
  readonly skills?: string[];
  /** Whether to expose workspace diagnostic capabilities as built-in tools (default: true) */
  readonly exposeWorkspaceTools?: boolean;
}
