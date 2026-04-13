import { Observable } from 'rxjs';

import { AgentEvent } from './agent-event';

export interface AgentResponse {
  readonly runId: string;
  readonly message: string;
}

export interface AgentProvider {
  readonly events$: Observable<AgentEvent>;

  init(): Promise<void>;
  run(input: string): Promise<AgentResponse>;
  stream(input: string): Observable<AgentEvent>;
  dispose(): Promise<void>;
}
