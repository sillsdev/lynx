import { DeepAgentToolDefinition } from './deep-agent-tool';

export interface DeepAgentSubAgentDefinition {
  readonly name: string;
  readonly description: string;
  readonly systemPrompt: string;
  readonly model?: string;
  readonly tools?: DeepAgentToolDefinition[];
}
