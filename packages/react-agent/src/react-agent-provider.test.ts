import { AgentEventType, DiagnosticProvider, DocumentAccessor } from '@sillsdev/lynx';
import { FakeToolCallingModel } from 'langchain';
import { firstValueFrom, take, toArray } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod';

import type { ReactAgentConfig } from './react-agent-config';
import { ReactAgentProvider } from './react-agent-provider';

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

describe('ReactAgentProvider', () => {
  const baseConfig: ReactAgentConfig = {
    model: createTextOnlyModel(),
    documents: mock<DocumentAccessor>(),
    applyEdit: async () => {
      /* empty */
    },
  };

  describe('init()', () => {
    it('passes custom tools to the agent', async () => {
      const config: ReactAgentConfig = {
        model: createTextOnlyModel(),
        documents: mock<DocumentAccessor>(),
        applyEdit: async () => {
          /* empty */
        },
        tools: [
          {
            name: 'my_tool',
            description: 'A test tool',
            schema: z.object({ input: z.string() }),
            execute: () => Promise.resolve('result'),
          },
        ],
      };
      const provider = new ReactAgentProvider(config);
      await provider.init();

      // Verify init completes without error - tools are passed to createAgentGraph internally
      const result = await provider.run('hello');
      expect(result.runId).toBeDefined();
    });

    it('creates diagnostic provider tools when diagnosticProviders are supplied', async () => {
      const diagnosticProvider = mock<DiagnosticProvider>();
      Object.assign(diagnosticProvider, { id: 'test-provider', description: 'A test diagnostic provider' });
      diagnosticProvider.getDiagnostics.mockResolvedValue([]);

      const config: ReactAgentConfig = {
        model: createToolCallingModel(),
        documents: mock<DocumentAccessor>(),
        applyEdit: async () => {
          /* empty */
        },
        diagnosticProviders: [diagnosticProvider],
      };
      const provider = new ReactAgentProvider(config);

      // Should not throw - diagnostic provider tools are created and bound
      await provider.init();
    });
  });

  describe('run()', () => {
    it('throws if not initialized', async () => {
      const provider = new ReactAgentProvider(baseConfig);
      await expect(provider.run('test')).rejects.toThrow('Agent not initialized');
    });

    it('returns AgentResponse with runId and message', async () => {
      const provider = new ReactAgentProvider(baseConfig);
      await provider.init();

      const result = await provider.run('test input');

      expect(result.runId).toBeDefined();
      expect(typeof result.message).toBe('string');
      expect(result.message.length).toBeGreaterThan(0);
    });

    it('emits Started and Completed events to global events$', async () => {
      const provider = new ReactAgentProvider(baseConfig);
      await provider.init();

      const eventsPromise = firstValueFrom(provider.events$.pipe(take(2), toArray()));
      await provider.run('test input');
      const events = await eventsPromise;

      expect(events).toHaveLength(2);
      expect(events[0].type).toBe(AgentEventType.Started);
      expect(events[1].type).toBe(AgentEventType.Completed);
    });

    it('invokes a tool and returns the final message', async () => {
      const config: ReactAgentConfig = {
        model: createToolCallingModel(),
        documents: mock<DocumentAccessor>(),
        applyEdit: async () => {
          /* empty */
        },
        tools: [greetToolDefinition],
      };
      const provider = new ReactAgentProvider(config);
      await provider.init();

      const result = await provider.run('Please greet World');

      expect(result.runId).toBeDefined();
      expect(result.message).toBeDefined();
    });
  });

  describe('stream()', () => {
    it('errors if not initialized', async () => {
      const provider = new ReactAgentProvider(baseConfig);

      await expect(firstValueFrom(provider.stream('test'))).rejects.toThrow('Agent not initialized');
    });

    it('emits Started and Completed events', async () => {
      const provider = new ReactAgentProvider(baseConfig);
      await provider.init();

      const events = await firstValueFrom(provider.stream('test input').pipe(toArray()));

      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(events[0].type).toBe(AgentEventType.Started);
      expect(events[events.length - 1].type).toBe(AgentEventType.Completed);
    });

    it('emits tool call and tool result events when tools are used', async () => {
      const config: ReactAgentConfig = {
        model: createToolCallingModel(),
        documents: mock<DocumentAccessor>(),
        applyEdit: async () => {
          /* empty */
        },
        tools: [greetToolDefinition],
      };
      const provider = new ReactAgentProvider(config);
      await provider.init();

      const events = await firstValueFrom(provider.stream('Greet World').pipe(toArray()));

      expect(events[0].type).toBe(AgentEventType.Started);
      expect(events[events.length - 1].type).toBe(AgentEventType.Completed);

      const toolCallEvents = events.filter((e) => e.type === AgentEventType.ToolCall);
      expect(toolCallEvents.length).toBeGreaterThanOrEqual(1);

      const toolResultEvents = events.filter((e) => e.type === AgentEventType.ToolResult);
      expect(toolResultEvents.length).toBeGreaterThanOrEqual(1);
    });

    it('forwards events to global events$', async () => {
      const provider = new ReactAgentProvider(baseConfig);
      await provider.init();

      const globalEventsPromise = firstValueFrom(provider.events$.pipe(take(2), toArray()));
      await firstValueFrom(provider.stream('test input').pipe(toArray()));
      const globalEvents = await globalEventsPromise;

      expect(globalEvents).toHaveLength(2);
      expect(globalEvents[0].type).toBe(AgentEventType.Started);
    });
  });

  describe('dispose()', () => {
    it('completes the events subject', async () => {
      const provider = new ReactAgentProvider(baseConfig);
      let completed = false;
      provider.events$.subscribe({ complete: () => (completed = true) });

      await provider.dispose();

      expect(completed).toBe(true);
    });
  });
});
