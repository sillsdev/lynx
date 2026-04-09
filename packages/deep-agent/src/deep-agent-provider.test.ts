import { WorkspaceAccessor } from '@sillsdev/lynx';
import { AgentEventType } from '@sillsdev/lynx';
import { FakeToolCallingModel } from 'langchain';
import { firstValueFrom, take, toArray } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod';

import type { DeepAgentConfig } from './deep-agent-config';
import { DeepAgentProvider } from './deep-agent-provider';

function createTextOnlyModel(): FakeToolCallingModel {
  return new FakeToolCallingModel({ toolCalls: [] });
}

function createToolCallingModel(): FakeToolCallingModel {
  return new FakeToolCallingModel({
    toolCalls: [[{ name: 'greet', args: { name: 'World' }, id: 'call_1' }], []],
  });
}

const greetToolDefinition = {
  name: 'greet',
  description: 'Greet someone by name',
  schema: z.object({ name: z.string() }),
  execute: ({ name }: { name: string }) => Promise.resolve(`Hello, ${name}!`),
};

describe('DeepAgentProvider', () => {
  const baseConfig: DeepAgentConfig = {
    model: createTextOnlyModel(),
    exposeWorkspaceTools: false,
  };

  describe('init()', () => {
    it('passes custom tools to the agent', async () => {
      const config: DeepAgentConfig = {
        model: createTextOnlyModel(),
        exposeWorkspaceTools: false,
        tools: [
          {
            name: 'my_tool',
            description: 'A test tool',
            schema: z.object({ input: z.string() }),
            execute: () => Promise.resolve('result'),
          },
        ],
      };
      const provider = new DeepAgentProvider(config);
      await provider.init(mock<WorkspaceAccessor>());

      // Verify init completes without error - tools are passed to createDeepAgent internally
      const result = await provider.run('hello');
      expect(result.runId).toBeDefined();
    });

    it('creates workspace tools when exposeWorkspaceTools is true', async () => {
      const workspace = mock<WorkspaceAccessor>();
      workspace.getDiagnostics.mockResolvedValue([]);

      const config: DeepAgentConfig = {
        model: createToolCallingModel(),
        exposeWorkspaceTools: true,
      };
      const provider = new DeepAgentProvider(config);

      // Should not throw - workspace tools are created and bound
      await provider.init(workspace);
    });
  });

  describe('run()', () => {
    it('throws if not initialized', async () => {
      const provider = new DeepAgentProvider(baseConfig);
      await expect(provider.run('test')).rejects.toThrow('Agent not initialized');
    });

    it('returns AgentResponse with runId and message', async () => {
      const provider = new DeepAgentProvider(baseConfig);
      await provider.init(mock<WorkspaceAccessor>());

      const result = await provider.run('test input');

      expect(result.runId).toBeDefined();
      expect(typeof result.message).toBe('string');
      expect(result.message.length).toBeGreaterThan(0);
    });

    it('emits Started and Completed events to global events$', async () => {
      const provider = new DeepAgentProvider(baseConfig);
      await provider.init(mock<WorkspaceAccessor>());

      const eventsPromise = firstValueFrom(provider.events$.pipe(take(2), toArray()));
      await provider.run('test input');
      const events = await eventsPromise;

      expect(events).toHaveLength(2);
      expect(events[0].type).toBe(AgentEventType.Started);
      expect(events[1].type).toBe(AgentEventType.Completed);
    });

    it('invokes a tool and returns the final message', async () => {
      const config: DeepAgentConfig = {
        model: createToolCallingModel(),
        exposeWorkspaceTools: false,
        tools: [greetToolDefinition],
      };
      const provider = new DeepAgentProvider(config);
      await provider.init(mock<WorkspaceAccessor>());

      const result = await provider.run('Please greet World');

      expect(result.runId).toBeDefined();
      expect(result.message).toBeDefined();
    });
  });

  describe('stream()', () => {
    it('errors if not initialized', async () => {
      const provider = new DeepAgentProvider(baseConfig);

      await expect(firstValueFrom(provider.stream('test'))).rejects.toThrow('Agent not initialized');
    });

    it('emits Started and Completed events', async () => {
      const provider = new DeepAgentProvider(baseConfig);
      await provider.init(mock<WorkspaceAccessor>());

      const events = await firstValueFrom(provider.stream('test input').pipe(toArray()));

      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(events[0].type).toBe(AgentEventType.Started);
      expect(events[events.length - 1].type).toBe(AgentEventType.Completed);
    });

    it('emits tool call and tool result events when tools are used', async () => {
      const config: DeepAgentConfig = {
        model: createToolCallingModel(),
        exposeWorkspaceTools: false,
        tools: [greetToolDefinition],
      };
      const provider = new DeepAgentProvider(config);
      await provider.init(mock<WorkspaceAccessor>());

      const events = await firstValueFrom(provider.stream('Greet World').pipe(toArray()));

      expect(events[0].type).toBe(AgentEventType.Started);
      expect(events[events.length - 1].type).toBe(AgentEventType.Completed);

      const toolCallEvents = events.filter((e) => e.type === AgentEventType.ToolCall);
      expect(toolCallEvents.length).toBeGreaterThanOrEqual(1);

      const toolResultEvents = events.filter((e) => e.type === AgentEventType.ToolResult);
      expect(toolResultEvents.length).toBeGreaterThanOrEqual(1);
    });

    it('forwards events to global events$', async () => {
      const provider = new DeepAgentProvider(baseConfig);
      await provider.init(mock<WorkspaceAccessor>());

      const globalEventsPromise = firstValueFrom(provider.events$.pipe(take(2), toArray()));
      await firstValueFrom(provider.stream('test input').pipe(toArray()));
      const globalEvents = await globalEventsPromise;

      expect(globalEvents).toHaveLength(2);
      expect(globalEvents[0].type).toBe(AgentEventType.Started);
    });
  });

  describe('dispose()', () => {
    it('completes the events subject', async () => {
      const provider = new DeepAgentProvider(baseConfig);
      let completed = false;
      provider.events$.subscribe({ complete: () => (completed = true) });

      await provider.dispose();

      expect(completed).toBe(true);
    });
  });
});
