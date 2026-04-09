import { Observable } from 'rxjs';

import { TextEdit } from '../common/text-edit';
import { WorkspaceAccessor } from '../workspace/workspace-accessor';
import { AgentEvent } from './agent-event';

export interface AgentResponse {
  readonly runId: string;
  readonly message: string;
}

export interface AgentProvider<T = TextEdit> {
  readonly events$: Observable<AgentEvent>;

  init(workspace: WorkspaceAccessor<T>): Promise<void>;
  run(input: string): Promise<AgentResponse>;
  stream(input: string): Observable<AgentEvent>;
  dispose(): Promise<void>;
}
