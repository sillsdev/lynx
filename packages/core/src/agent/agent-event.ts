import { Observable } from 'rxjs';

export enum AgentEventType {
  Started = 'started',
  Message = 'message',
  ToolCall = 'tool-call',
  ToolResult = 'tool-result',
  Error = 'error',
  Completed = 'completed',
}

export interface AgentEventBase {
  readonly type: AgentEventType;
  readonly timestamp: number;
  readonly runId: string;
}

export interface AgentStartedEvent extends AgentEventBase {
  readonly type: AgentEventType.Started;
}

export interface AgentMessageEvent extends AgentEventBase {
  readonly type: AgentEventType.Message;
  readonly content: string;
  readonly isPartial: boolean;
}

export interface AgentToolCallEvent extends AgentEventBase {
  readonly type: AgentEventType.ToolCall;
  readonly toolName: string;
  readonly args: Record<string, unknown>;
}

export interface AgentToolResultEvent extends AgentEventBase {
  readonly type: AgentEventType.ToolResult;
  readonly toolName: string;
  readonly result: unknown;
}

export interface AgentErrorEvent extends AgentEventBase {
  readonly type: AgentEventType.Error;
  readonly error: string;
}

export interface AgentCompletedEvent extends AgentEventBase {
  readonly type: AgentEventType.Completed;
  readonly finalMessage: string;
}

export type AgentEvent =
  | AgentStartedEvent
  | AgentMessageEvent
  | AgentToolCallEvent
  | AgentToolResultEvent
  | AgentErrorEvent
  | AgentCompletedEvent;

export interface AgentEventStream {
  readonly events$: Observable<AgentEvent>;
}
