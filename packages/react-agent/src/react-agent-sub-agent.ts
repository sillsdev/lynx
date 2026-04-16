import { ReactAgentToolDefinition } from './react-agent-tool';

export interface ReactAgentSubAgentDefinition {
  readonly name: string;
  readonly description: string;
  readonly systemPrompt: string;
  readonly model?: string;
  readonly tools?: ReactAgentToolDefinition[];
}
