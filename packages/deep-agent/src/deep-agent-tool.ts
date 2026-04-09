import { z } from 'zod';

export interface DeepAgentToolDefinition<T extends z.ZodType = z.ZodType> {
  readonly name: string;
  readonly description: string;
  readonly schema: T;
  execute(args: z.infer<T>): Promise<unknown>;
}
